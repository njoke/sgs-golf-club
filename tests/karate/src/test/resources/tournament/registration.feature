Feature: Tournament registration

  Background:
    * def bootstrap = call read('classpath:shared/bootstrap.feature')
    * def adminToken = bootstrap.adminToken
    * def memberToken = bootstrap.memberToken
    * def memberUser = bootstrap.memberUser
    * def clubId = bootstrap.clubId
    * def jaredGolferId = bootstrap.jaredGolferId
    * def cedarIronsCourseId = bootstrap.cedarIronsCourseId
    Given url baseUrl
    And header Content-Type = 'application/json'

  Scenario: Member registers for fresh open tournament
    * def tournamentName = 'Karate Open ' + java.util.UUID.randomUUID()
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        "query": "mutation CreateTournament($input: CreateTournamentInput!) { createTournament(input: $input) { id name registrationStatus } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)",
            "name": "#(tournamentName)",
            "description": "Karate tournament",
            "startDate": "2026-07-15T00:00:00.000Z",
            "courseId": "#(cedarIronsCourseId)",
            "format": "STROKE_PLAY",
            "registrationStatus": "OPEN",
            "registrationOpenAt": "2026-06-01T00:00:00.000Z",
            "registrationCloseAt": "2026-12-31T23:59:59.000Z",
            "maxPlayers": 10,
            "entryFee": 50,
            "membersOnly": true,
            "allowGuests": false,
            "eligibility": { "gender": "ALL", "membershipCodes": ["R"] }
          }
        }
      }
      """
    When method post
    Then status 200
    * def tournamentId = response.data.createTournament.id

    And header Authorization = 'Bearer ' + memberToken
    And request
      """
      {
        "query": "mutation Register($input: RegisterForTournamentInput!) { registerForTournament(input: $input) { id status paymentStatus golferId } }",
        "variables": {
          "input": {
            "tournamentId": "#(tournamentId)",
            "golferId": "#(jaredGolferId)",
            "email": "#(memberUser.email)",
            "agreedToTerms": true
          }
        }
      }
      """
    When method post
    Then status 200
    And match response.data.registerForTournament.status == 'REGISTERED'
    And match response.data.registerForTournament.paymentStatus == 'UNPAID'

  Scenario: Duplicate registration returns registration duplicate
    * def tournamentName = 'Karate Duplicate ' + java.util.UUID.randomUUID()
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        "query": "mutation CreateTournament($input: CreateTournamentInput!) { createTournament(input: $input) { id } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)",
            "name": "#(tournamentName)",
            "startDate": "2026-07-20T00:00:00.000Z",
            "courseId": "#(cedarIronsCourseId)",
            "format": "STROKE_PLAY",
            "registrationStatus": "OPEN",
            "registrationOpenAt": "2026-06-01T00:00:00.000Z",
            "registrationCloseAt": "2026-12-31T23:59:59.000Z"
          }
        }
      }
      """
    When method post
    Then status 200
    * def tournamentId = response.data.createTournament.id

    And header Authorization = 'Bearer ' + memberToken
    And request
      """
      {
        "query": "mutation Register($input: RegisterForTournamentInput!) { registerForTournament(input: $input) { id status } }",
        "variables": {
          "input": {
            "tournamentId": "#(tournamentId)",
            "golferId": "#(jaredGolferId)",
            "email": "#(memberUser.email)",
            "agreedToTerms": true
          }
        }
      }
      """
    When method post
    Then status 200

    And header Authorization = 'Bearer ' + memberToken
    And request
      """
      {
        "query": "mutation Register($input: RegisterForTournamentInput!) { registerForTournament(input: $input) { id status } }",
        "variables": {
          "input": {
            "tournamentId": "#(tournamentId)",
            "golferId": "#(jaredGolferId)",
            "email": "#(memberUser.email)",
            "agreedToTerms": true
          }
        }
      }
      """
    When method post
    Then status 200
    And match response.errors[0].extensions.code == 'REGISTRATION_DUPLICATE'
