Feature: Shared login helper

  Scenario:
    Given url baseUrl
    And header Content-Type = 'application/json'
    And request
      """
      {
        "query": "mutation Login($email: String!, $password: String!) { login(input: { email: $email, password: $password }) { token user { id email role clubIds golferId } } }",
        "variables": {
          "email": "#(email)",
          "password": "#(password)"
        }
      }
      """
    When method post
    Then status 200
    And match response.data.login.token == '#string'
    * def token = response.data.login.token
    * def user = response.data.login.user
