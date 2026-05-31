Feature: Auth — Login

  Background:
    * url baseUrl
    * header Content-Type = 'application/json'

  Scenario: Admin login returns JWT
    * def query = 'mutation { login(input: { email: "admin@safarigolfseattle.org", password: "Admin123!" }) { token user { email role } } }'
    Given request { query: '#(query)' }
    When method post
    Then status 200
    And match response.data.login.token != null
    And match response.data.login.user.role == 'CLUB_ADMIN'

  Scenario: Invalid credentials returns error
    * def query = 'mutation { login(input: { email: "bad@email.com", password: "wrong" }) { token user { email role } } }'
    Given request { query: '#(query)' }
    When method post
    Then status 200
    And match response.errors[0].extensions.code == 'INVALID_CREDENTIALS'
