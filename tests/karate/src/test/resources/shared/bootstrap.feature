Feature: Shared bootstrap data

  Scenario:
    * def adminAuth = call read('classpath:shared/login.feature') { email: '#(adminEmail)', password: '#(adminPassword)' }
    * def memberAuth = call read('classpath:shared/login.feature') { email: '#(memberEmail)', password: '#(memberPassword)' }
    * def adminToken = adminAuth.token
    * def memberToken = memberAuth.token
    * def memberUser = memberAuth.user

    Given url baseUrl
    And header Authorization = 'Bearer ' + adminToken
    And header Content-Type = 'application/json'

    And request { "query": "{ myClubs { id name } }" }
    When method post
    Then status 200
    * def clubId = response.data.myClubs[0].id

    And header Authorization = 'Bearer ' + adminToken
    And header Content-Type = 'application/json'
    And request
      """
      {
        "query": "query ClubGolfers($clubId: ID!) { golfers(filter: { clubId: $clubId, pageSize: 25 }) { nodes { id firstName lastName ghinNumber } pageInfo { totalCount } } }",
        "variables": {
          "clubId": "#(clubId)"
        }
      }
      """
    When method post
    Then status 200
    * def golferNodes = response.data.golfers.nodes
    * def jaredGolfer = karate.filter(golferNodes, function(x){ return x.lastName == 'Abwawo'; })[0]
    * def anotherGolfer = karate.filter(golferNodes, function(x){ return x.lastName != 'Abwawo'; })[0]
    * def jaredGolferId = jaredGolfer.id
    * def anotherGolferId = anotherGolfer.id

    And header Authorization = 'Bearer ' + adminToken
    And header Content-Type = 'application/json'
    And request
      """
      {
        "query": "query ClubCourses($clubId: ID!) { clubCourses(clubId: $clubId) { id courseName defaultMaleTeeId defaultFemaleTeeId tees { teeId teeName } } }",
        "variables": {
          "clubId": "#(clubId)"
        }
      }
      """
    When method post
    Then status 200
    * def courses = response.data.clubCourses
    * def cedarIronsCourse = karate.filter(courses, function(x){ return x.courseName == 'Cedar Irons Golf Club'; })[0]
    * def cedarIronsCourseId = cedarIronsCourse.id
    * def cedarIronsTeeId = cedarIronsCourse.defaultMaleTeeId ? cedarIronsCourse.defaultMaleTeeId : cedarIronsCourse.tees[0].teeId
