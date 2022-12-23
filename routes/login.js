/*
 회원가입("/signup")과 로그인("/login") 라우터 정의
*/

const express = require("express");
const router = express.Router();
const { User } = require("../models");
const jwt = require("jsonwebtoken");


/* 숙련 주차 추가: 회원 가입과 로그인, 로그인 검사 */
// POST - 회원 가입
// - 닉네임은 `최소 3자 이상, 알파벳 대소문자(a~z, A~Z), 숫자(0~9)`로 구성하기
// - 비밀번호는 `최소 4자 이상이며, 닉네임과 같은 값이 포함된 경우 회원가입에 실패`로 만들기
// - 비밀번호 확인은 비밀번호와 정확하게 일치하기
// - 닉네임, 비밀번호, 비밀번호 확인을 request에서 전달받기
// - 데이터베이스에 존재하는 닉네임을 입력한 채 회원가입 버튼을 누른 경우 "중복된 닉네임입니다." 라는 에러메세지를 response에 포함하기
// + 로그인 토큰이 없어도 응답해주기
router.post("/signup", async (req, res) => {
    const { nickname, password, confirm } = req.body;

    // 1. 닉네임 형식 검사 -> 412
    const nickReg = /^[a-zA-Z0-9][a-zA-Z0-9]*$/
    if (nickname.length < 3 || !nickReg.test(nickname)) { // 3자 미만이거나, 알파벳 대소문자와 숫자를 제외한 문자가 들어간 경우 에러
        return res.status(412).json({
            errorMessage: "닉네임의 형식이 일치하지 않습니다."
        });
    }
    // 2. 비밀번호 형식(최소 4자 이상) 검사 -> 412
    if (password.length < 4) {
        return res.status(412).json({
            errorMessage: "비밀번호는 4자 이상이어야 합니다."
        });
    }
    // 3. 비밀번호 형식(닉네임이 포함되지 않아야 함) 검사 -> 412
    if (password.search(nickname) !== -1) {
        return res.status(412).json({
            errorMessage: "비밀번호에 닉네임이 포함되어 있습니다."
        });
    }
    // 4. 비밀 번호 확인이 일치하는지 검사 -> 412
    if (password !== confirm) {
        return res.status(412).json({
            errorMessage: "비밀 번호 확인이 일치하지 않습니다."
        });
    }
    // 5. 중복된 닉네임 검사 -> 412 // 데이터베이스를 한 번 조회해야 하므로 뒷 단계로 미룬다.
    const existingUser = await User.findAll({
        where: { nickname }
    });
    if (existingUser.length > 0) {
        return res.status(412).json({
            errorMessage: "중복된 닉네임입니다."
        });
    }
    // 6. 회원 가입 처리 => 200
    try {
        await User.create({ nickname, password });
        res.status(201).json({
            message: "회원 가입에 성공하였습니다."
        });
    } catch (error) {
        // 7. 위에서 잡아내지 못한 어떤 문제가 발생 -> 400
        console.log(error.message);
        return res.status(400).json({
            errorMessage: "요청한 데이터 형식이 올바르지 않습니다."
        });
    }
})


// 로그인 API
// - 닉네임, 비밀번호를 request에서 전달받기
// - 로그인 버튼을 누른 경우 닉네임과 비밀번호가 데이터베이스에 등록됐는지 확인한 뒤, 하나라도 맞지 않는 정보가 있다면 "닉네임 또는 패스워드를 확인해주세요."라는 에러 메세지를 response에 포함하기
// - 로그인 성공 시 로그인 토큰을 클라이언트에게 Cookie로 전달하기
// + 로그인 토큰이 없어도 응답해주기
// - 요청 예시: { "nickname": "Developer",  "password": "1234" }
// - 응답 예시: { "token": "eyJhbGciO......." }
router.post("/login", async (req, res) => {
    // body를 해석해줄 body-parser는 더 상위 레벨(application 레벨)에 전역 미들웨어로 이미 배치되어 있다.
    const { nickname, password } = req.body;

    // 1. 닉네임 또는 비밀번호가 맞는지 검사 -> 412
    const user = await User.findOne({
        where: { nickname }
    })
    if (user === null || user.password !== password) {
        return res.status(412).json({
            errorMessage: "닉네임 또는 비밀번호를 확인해주세요."
        });
    }

    // 2. 이미 로그인 된 상태라면 "이미 로그인된 상태입니다"라고 말 안해주나..?
    //

    // 2. 닉네임과 비밀번호가 맞다면 로그인 토큰을 Cookie로 전달하기(?!)
    // jwt 토큰이 아니란 말이야..?! 아아... 일단 jwt로 해
    // => jwt 토큰 맞다. 일단 만료되지 않는 access 토큰만 만들어서 기능하게 하고,
    // 후에 refresh토큰 방식을 도입하자.
    //      (=> refreshObject 만들기, 두 토큰에 만료기간 걸기, auth-middleware.js 로직 수정하기)
    // 토큰 만들어 보낼 떄와 받을 때 약속할 것:
    // 1. 페이로드에 담겨오는 key 이름은 "userId"로 하겠다.
    // 2. 시크릿 키는 "homework-secret"으로 하겠다.
    const token = jwt.sign({ userId: user.userId }, "homework-secret");
    res.status(200).json({
        token: token
    })
})


// 로그인 검사
// - `아래 API를 제외하고` 모두 로그인 토큰을 전달한 경우만 정상 response를 전달받을 수 있도록 하기
//     - 회원가입 API
//     - 로그인 API
//     - 게시글 목록 조회 API
//     - 게시글 조회 API
//     - 댓글 목록 조회 API
// - 로그인 토큰을 전달하지 않은 채로 로그인이 필요한 API를 호출한 경우 "로그인이 필요합니다." 라는 에러 메세지를 response에 포함하기
// - 로그인 토큰을 전달한 채로 로그인 API 또는 회원가입 API를 호출한 경우 "이미 로그인이 되어있습니다."라는 에러 메세지를 response에 포함하기

module.exports = router;
