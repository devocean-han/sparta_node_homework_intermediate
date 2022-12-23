// 미들웨어 순서 생각하기 ------------------------------------------
// 일단 넣어야 하는 것들은:
// 1. express.json()
// 2. "/api", [postsRouter, commentsRouter]..
// 3. postsRouter에 commentsRouter를 합칠 것인가..?
//      => 일단 과제에서 주어진 주소 형식 그대로 가자. 합치지 않는다.
// 4. express.static("assets") => 아 이건 프론트 구현이 안 되어 있으므로 넣지 않는다.
// 5. express.urlencoded({ extended: false })
// 6. authMiddleware
//--------------------------------------------------------------

// 미들웨어 순서 및 전체 app.js 파일 구성:
// 1. 먼저 임포트 전부 (필요 라우터, 모델, 데이터베이스 모듈, 본인인증 미들웨어 등)
// 2. 그리고 미들웨어 express.json() 설치
// 3. 로그인, 회원가입 등의 app.js내 api들을 작성 후
// 4. app.use("/api", express.urlencoded({ extended: false }), [postsRouter, commentsRouter]); 설치.
// (+5. 각각의 GET, POST 등등의 루트마다 authMiddleware를 통과하도록 끼워넣는다.)
// 끝!!
// -------------------------------------------------------------

/* 1. 임포트 전부 -----------------------------------------------*/
// 필요 외부 모듈 임포트
const express = require('express');
const { Op } = require("sequelize");
// const jwt = require("jsonwebtoken");

// 익스프레스 실행 구성
const app = express();
const port = 3000;

// 필요 내부 모듈(라우터, 미들웨어) 임포트
const loginRouter = require('./routes/login');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
// const authMiddleware = require('./middlewares/auth-middleware');

// sequelize로 MySQL 연결 및 모델(User) 임포트
// (Cart와 Goods는 router 파일들에 들어가야 하므로 User만 있으면 된다.)
const { User } = require("./models");


/* 2. express.json()와 express.urlencoded() 미들웨어 설치 ---------------*/
// json을 해석해주는 body parser 미들웨어를 먼저 통과하도록 해야
// app.js 내에서 작성되는 루트들이 json형식으로 들어오는 body 데이터를 다룰 수 있다.
// 그래서 이게 제일 먼저 설치됨.
// 추가로 (POST나 PUT 요청으로 들어오는) body 데이터가 JSON 타입이 아니라
// URLencoded 타입일 수도 있으니까(프론트가 보내주기 전까진 모름) 그에 해당하는
// body parser도 일단 여기 제일 위쪽에다 설치해준다.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


/* 3. 로그인, 회원가입 등 app.js 내 루트 작성
  을 하려고 하였으나 이 또한 router로 묶어서 모듈로 분리함.
  "/api" 경로로 통하는 루트라고 가정하였다. -----------------------*/
// Entry point: 여기 app.js에 지정해주는 게 좋다.
app.get("/", (req, res) => {
  res.send("Welcome to my (back-end only) blog!!");
});


/* 4. "/api" 경로용 라우터 미들웨어 설치하기 -----------------------*/
app.use("/api", [loginRouter, postsRouter, commentsRouter]);


/* 5. 사용자 인가용(인증용?) authMiddleware 미들웨어는 루트마다 설치
      => 아니면 이것도 전역 미들웨어로?! 어디보자... -----------------------*/
// 로그인 검사
// - `아래 API를 제외하고` 모두 로그인 토큰을 전달한 경우만 정상 response를 전달받을 수 있도록 하기
//     - 회원가입 API
//     - 로그인 API
//     - 게시글 목록 조회 API
//     - 게시글 조회 API
//     - 댓글 목록 조회 API
// - 로그인 토큰을 전달하지 않은 채로 로그인이 필요한 API를 호출한 경우 "로그인이 필요합니다." 라는 에러 메세지를 response에 포함하기
// - 로그인 토큰을 전달한 채로 로그인 API 또는 회원가입 API를 호출한 경우 "이미 로그인이 되어있습니다."라는 에러 메세지를 response에 포함하기

// '로그인' 라우터 중 '회원가입'과 '로그인' API 모두 로그인 인증이 필요 없다.
// => 전부 불필요
// '게시글' 라우터 중 '목록 조회'와 '상세 조회' API가 로그인 인증이 필요 없다.
// => 일부만 불필요
// '댓글' 라우터 중 '목록 조회' API가 로그인 인증이 필요 없다.
// => 일부만 불필요(=댓글 api 중에서도 인증이 필요 있고 없고가 갈리었다).

// ==> '로그인'과 '게시글', '댓글' 라우터 모두
//      로그인 인증(authMiddleware) 미들웨어를 전역으로 걸어버릴 수가 없게 되었다.
// ===> 따라서 4번 항목을 그대로
//      app.use("/api", (로그인 인증 미들웨어 거치지 않고)[로그인 라우터1, 게시글 라우터2, 댓글 라우터3])
//      으로 냅두기로 한다.



app.listen(port, () => {
  console.log(port, '포트로 서버가 열렸어요!');
});