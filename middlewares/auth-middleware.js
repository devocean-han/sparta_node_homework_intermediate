/* Access 토큰만을 주고 받는 JWT 토큰 인증

    쿠키로 보낸 상태이고(최초 로그인 응답으로),
    요청 헤더의 Authorization: "Bearer xxx.yyy.zzz" 항목으로 들어오는 토큰을 받아 검증한다.

 */

const jwt = require("jsonwebtoken")
const { User } = require("../models")


module.exports = async (req, res, next) => {
    // 1. 프론트로부터 header로 전달받은 jwt 토큰을 가져온다.
    const { authorization } = req.headers;
    console.log(authorization)

    // 2.
    // const [ authType, authToken ] = authorization.split(" ");
    const [authType, authToken] = (authorization || "").split(" ");
      // => authorization이 null이나 undefined일 수 있다. 그럴 땐
      // falsy || falsy => 뒤의 falsy가 반환되는 걸 이용해서 "".split(" ")이 실행되도록 해놓은 것이다.
      // 그 결과값은 [""]가 되고, 결국 authType = "", authToken = undefined가 되게 된다.
      // (undefined.split(' ')을 하면 Uncaught TypeError: Cannot read properties of undefined 에러가 뜬다)
    console.log(authType == "Bearer") // false?! => 왜..?!
    console.log(!!authToken); // true => 오케이

    // 3. 토큰 타입이 Bearer가 아닌 경우와
    // 3-1. jwt 토큰 값이 비었을 경우엔
    // 로그인된 사용자가 아니었을 가능성이 크므로(?) 로그인하라는 에러 메세지 출력
    if (authType != "Bearer" || !authToken) {
        res.status(401).json({
            errorMessage: "로그인이 필요한 기능입니다."
        })
        return;
    }

    // 4. 토큰 타입이 Bearer가 맞고, 토큰 값도 들어온 경우,
    // 해당 jwt 토큰이 유효한가를 검증하기 (복호화 + 검증)
    try {
        // 토큰 만들어 보낼 떄와 받을 때 약속한 것:
        // 1. 페이로드에 담겨오는 key 이름은 "userId"로 하겠다.
        // 2. 시크릿 키는 "homework-secret"으로 하겠다.
        const { userId } = jwt.verify(authToken, "homework-secret")

        User.findByPk(userId)
            .then((user) => {
            res.locals.user = user;
            next();
        });

    } catch(error) {
        console.log(error.message)
        res.status(401).json({
            errorMessage: "로그인 인증에 실패하였습니다."
        });
        // return;
    }
    // return;
}
