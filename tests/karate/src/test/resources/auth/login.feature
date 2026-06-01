Feature: Authentication

  Background:
    Given url baseUrl
    And header Content-Type = 'application/json'

  Scenario: Admin login returns token and club admin role
    And request
      """
      {
        "query": "mutation { login(input: { email: \"admin@sgs.golf\", password: \"Admin123!\" }) { token user { email role } } }"
      }
      """
    When method post
    Then status 200
    And match response.data.login.token == '#string'
    And match response.data.login.user.email == 'admin@sgs.golf'
    And match response.data.login.user.role == 'CLUB_ADMIN'

  Scenario: Wrong password returns generic error
    And request
      """
      {
        "query": "mutation { login(input: { email: \"admin@sgs.golf\", password: \"wrong\" }) { token } }"
      }
      """
    When method post
    Then status 200
    And match response.errors[0].message == 'Invalid email or password.'
    And match response.errors[0].extensions.code == 'INVALID_CREDENTIALS'

  Scenario: Member login returns linked golfer id
    And request
      """
      {
        "query": "mutation { login(input: { email: \"jared@sgs.golf\", password: \"Member123!\" }) { token user { role golferId } } }"
      }
      """
    When method post
    Then status 200
    And match response.data.login.user.role == 'MEMBER'
    And match response.data.login.user.golferId == '#string'

  Scenario: Protected query without token returns unauthenticated
    And request { "query": "{ myClubs { id } }" }
    When method post
    Then status 200
    And match response.errors[0].extensions.code == 'UNAUTHENTICATED'
