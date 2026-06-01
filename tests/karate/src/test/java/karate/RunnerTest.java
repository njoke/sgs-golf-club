package karate;

import com.intuit.karate.junit5.Karate;

class RunnerTest {
  @Karate.Test
  Karate testAll() {
    return Karate.run(
      "classpath:auth/login.feature",
      "classpath:golfer/roster.feature",
      "classpath:score/post-score.feature",
      "classpath:tournament/registration.feature"
    );
  }
}
