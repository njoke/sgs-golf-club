Feature: Golfer roster

  Background:
    * def bootstrap = call read('classpath:shared/bootstrap.feature')
    * def adminToken = bootstrap.adminToken
    * def clubId = bootstrap.clubId
    Given url baseUrl
    And header Authorization = 'Bearer ' + adminToken
    And header Content-Type = 'application/json'

  Scenario: Roster query returns seeded golfers
    And request
      """
      {
        "query": "query Roster($clubId: ID!) { golfers(filter: { clubId: $clubId, pageSize: 25 }) { nodes { firstName lastName ghinNumber membershipStatus } pageInfo { totalCount } } }",
        "variables": { "clubId": "#(clubId)" }
      }
      """
    When method post
    Then status 200
    And match response.data.golfers.nodes[*].membershipStatus contains 'ACTIVE'
    * assert response.data.golfers.pageInfo.totalCount >= 6

  Scenario: Search by name returns Jared Abwawo
    And request
      """
      {
        "query": "query SearchRoster($clubId: ID!) { golfers(filter: { clubId: $clubId, searchText: \"Abwawo\", pageSize: 25 }) { nodes { firstName lastName } } }",
        "variables": { "clubId": "#(clubId)" }
      }
      """
    When method post
    Then status 200
    And match response.data.golfers.nodes[0].lastName == 'Abwawo'

  Scenario: Add new golfer succeeds
    * def uniqueEmail = 'karate_' + java.util.UUID.randomUUID() + '@example.com'
    And request
      """
      {
        "query": "mutation AddGolfer($input: AddNewGolferInput!) { addNewGolfer(input: $input) { id firstName lastName email membershipStatus } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)",
            "firstName": "Karate",
            "lastName": "Player",
            "gender": "M",
            "email": "#(uniqueEmail)",
            "membershipCode": "R"
          }
        }
      }
      """
    When method post
    Then status 200
    And match response.data.addNewGolfer.membershipStatus == 'ACTIVE'
    And match response.data.addNewGolfer.email == uniqueEmail

  Scenario: Duplicate golfer email fails with already exists
    And request
      """
      {
        "query": "mutation AddGolfer($input: AddNewGolferInput!) { addNewGolfer(input: $input) { id } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)",
            "firstName": "Dup",
            "lastName": "User",
            "gender": "M",
            "email": "j_midimo@hotmail.com",
            "membershipCode": "R"
          }
        }
      }
      """
    When method post
    Then status 200
    And match response.errors[0].extensions.code == 'ALREADY_EXISTS'
