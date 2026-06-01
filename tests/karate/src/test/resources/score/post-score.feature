Feature: Score posting

  Background:
    * def bootstrap = call read('classpath:shared/bootstrap.feature')
    * def adminToken = bootstrap.adminToken
    * def memberToken = bootstrap.memberToken
    * def clubId = bootstrap.clubId
    * def jaredGolferId = bootstrap.jaredGolferId
    * def anotherGolferId = bootstrap.anotherGolferId
    * def cedarIronsCourseId = bootstrap.cedarIronsCourseId
    * def cedarIronsTeeId = bootstrap.cedarIronsTeeId
    Given url baseUrl
    And header Content-Type = 'application/json'

  Scenario: Post 18-hole score calculates differential
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        "query": "mutation PostScore($input: PostScoreInput!) { postScore(input: $input) { id grossScore differential status } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)",
            "golferId": "#(jaredGolferId)",
            "datePlayed": "2026-06-01T00:00:00.000Z",
            "scoreType": "HOME",
            "holes": 18,
            "entryMode": "TOTAL_SCORE",
            "courseId": "#(cedarIronsCourseId)",
            "teeId": "#(cedarIronsTeeId)",
            "courseName": "Cedar Irons Golf Club",
            "teeName": "White",
            "grossScore": 85,
            "courseRating": 68.5,
            "slopeRating": 121,
            "par": 72
          }
        }
      }
      """
    When method post
    Then status 200
    And match response.data.postScore.status == 'POSTED'
    And match response.data.postScore.differential == 15.4

  Scenario: Invalid slope rating fails validation
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        "query": "mutation PostScore($input: PostScoreInput!) { postScore(input: $input) { id } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)",
            "golferId": "#(jaredGolferId)",
            "datePlayed": "2026-06-01T00:00:00.000Z",
            "scoreType": "HOME",
            "holes": 18,
            "entryMode": "TOTAL_SCORE",
            "courseName": "Test Course",
            "teeName": "Blue",
            "grossScore": 80,
            "courseRating": 68.5,
            "slopeRating": 200,
            "par": 72
          }
        }
      }
      """
    When method post
    Then status 200
    And match response.errors[0].extensions.code == 'VALIDATION_ERROR'
    And match response.errors[0].message contains 'Slope rating must be between 55 and 155'

  Scenario: Member cannot post for another golfer
    And header Authorization = 'Bearer ' + memberToken
    And request
      """
      {
        "query": "mutation PostScore($input: PostScoreInput!) { postScore(input: $input) { id } }",
        "variables": {
          "input": {
            "clubId": "#(clubId)",
            "golferId": "#(anotherGolferId)",
            "datePlayed": "2026-06-01T00:00:00.000Z",
            "scoreType": "HOME",
            "holes": 18,
            "entryMode": "TOTAL_SCORE",
            "courseName": "Test Course",
            "teeName": "Blue",
            "grossScore": 80,
            "courseRating": 68.5,
            "slopeRating": 121,
            "par": 72
          }
        }
      }
      """
    When method post
    Then status 200
    And match response.errors[0].extensions.code == 'UNAUTHORIZED'
