/*
  "/comments/..." 라우터 정의
  + MongoDB(mongoose) => MySQL(sequelize)로 DB 변경함
*/

// 외부 모듈(express) 임포트 후 express의 라우터 생성
const express = require("express");
const router = express.Router();
const sequelize = require("sequelize");

// DB 모델 임포트
// const Comments = require("../schemas/comment"); // mongoose 버전
const { Comment, User } = require("../models");

// 사용자 인증 미들웨어 임포트
const authMiddleware = require('../middlewares/auth-middleware');

// // req.body를 사용하기 위한 body parser 미들웨어를 지정함
// app.use(express.json());
// // => 이걸 여기다 지정해야 하는가, app.js 내에 해야 하는가? app.js에 해야 한다.ㅇㅇ
// ==> 여기다 하려고 했으면 router.use(express.json()) 했어야 한다.
// 이곳(router 레벨)에 바인딩하는 것과 application 레벨에 바인딩하는 것의 차이는?
// => 일단 application 레벨이 더 전체적으로 적용이 될 것 같다.
// express.json() 이 한 번 '도입되면' 그 이후론 'json을 읽을 수 있는 상태가 유지'되는 식인가?


// (req.params, req.body 등이) 빈 'Object'(객체)인지 테스트
// 하려고 하였으나 사용처가 미미하고 그마저도 객체 구조 분해 할당으로
// 각각 체크가 가능해짐으로써 사용하지 않게 됨.
function isEmptyObject(value) {
  return value // null과 undefined로 주어져도 에러를 던지지 않도록.
      && Object.keys(value).length === 0
      && value.constructor === Object;
}


// POST - 댓글 작성
// + 로그인 토큰을 전달하지 않은 채로 댓글 작성란을 누르면 "로그인이 필요한 기능입니다." 라는 에러 메세지를 response에 포함하기
// - 댓글 내용을 비워둔 채 댓글 작성 API를 호출하면 "댓글 내용을 입력해주세요" 라는 메세지를 return하기
// + 로그인 토큰도 전달하고 댓글 내용도 입력했을 때만 댓글 작성 API를 호출한 경우 작성한 댓글을 추가하기
router.post('/comments/:_postId', authMiddleware, async (req, res) => {

    // params의 _postId 체크
    // 근데 아마 _postId가 아예 없고서는 요청이 불가능할 것이다. 차라리
    // 해당 postId를 가지는 게시글이 있냐 없냐를 검사하는 게 더 합리적이지 않을까..?
    const postId = req.params._postId;
    if (!postId) { // _postId가 빈 채로 요청이 들어왔다면 id는 undefined일 것임.
        return res.status(412).json({ errorMessage: "데이터 형식이 올바르지 않습니다." })
    }

    // body 체크
    const { comment } = req.body;
    if (!comment) {
        return res.status(400).json({ errorMessage: "댓글 내용을 입력해주세요."})
    }

    // 400 Bad request
    // 해당하는 게시글 id가 없음
    // ...


    // DB에 insert하기
    try {
        // 200 Success
        const userId = res.locals.user ? res.locals.user.userId : 0; // 로그인 안 됐을 때 테스트 용으로.
        const commented = await Comment.create({ comment, postId, userId });
        console.log(commented.dataValues);
        return res.status(201).json({ message: "댓글을 작성하였습니다." });

    } catch (error) {
        // 400 Bad request
        // 다른 예외 케이스에서 처리하지 못한 에러가 발생한 경우
        console.log(error);
        return res.status(400).json({ errorMessage: "댓글 작성에 실패하였습니다." });
    }
})


// GET - 댓글 조회(목록)
// - 조회하는 게시글에 작성된 모든 댓글을 목록 형식으로 볼 수 있도록 하기
// - 작성 날짜 기준으로 내림차순 정렬하기
// + 로그인 토큰이 없어도 응답해주기
router.get('/comments/:_postId', async (req, res) => {

    // params의 _postId 체크
    // 근데 아마 _postId가 아예 없고서는 요청이 불가능할 것이다. 차라리
    // 해당 postId를 가지는 게시글이 있냐 없냐를 검사하는 게 더 합리적이겠다...
    const postId = req.params._postId;
    if (!postId) { // postId가 undefined면:
        return res.status(400).json({ message: "데이터 형식이 올바르지 않습니다" });
    }

    // 400 Bad request
    // 해당하는 게시글 id가 없음
    // => 그냥 빈 데이터 반환함.


    // 데이터 가져오기: commentId, userId, (nickname), comment, createdAt, updatedAt
    const comment_list = await Comment.findAll({
        raw: true,
        include: [{
            model: User,
            // as: 'user',
            association: Comment.belongsTo(User, {
                foreignKey: 'userId',
                constraints: false,
            }),
            attributes: []
        }],
        where: { postId },
        order: [
            ['createdAt', 'DESC']
        ],
        attributes: ['commentId', 'userId', 'User.nickname', 'comment',  'createdAt', 'updatedAt']
    });
    res.status(200).json({ data: comment_list })
})


// PUT - 댓글 수정
// + 로그인 토큰을 전달하지 않은 채로 댓글 작성란을 누르면 "로그인이 필요한 기능입니다." 라는 에러 메세지를 response에 포함하기
// - 댓글 내용을 비워둔 채 댓글 수정 API를 호출하면 "댓글 내용을 입력해주세요" 라는 메세지를 return하기
// - 댓글 내용을 입력하고 댓글 수정 API를 호출한 경우 작성한 댓글을 수정하기
// + 로그인 토큰에 해당하는 사용자가 작성한 댓글만 수정 가능하도록 하기
router.put('/comments/:_commentId', authMiddleware, async (req, res) => {

    // 400 bad request
    // params의 _commentId 체크
    // 아마 _commentId가 아예 비어서는 PUT 요청 자체가 불가능할 것이다.
    const commentId = req.params._commentId;
    if (!commentId) { // commentId가 undefined면:
        return res.status(400).json({ errorMessage: "데이터 형식이 올바르지 않습니다" });
    }

    const { userId } = res.locals.user;

    // 412
    // body 체크 - content
    const content = req.body.comment;
    if (!content) { // content가 없거나 빈 문자열이라면
        return res.status(412).json({ errorMessage: "데이터 형식이 올바르지 않습니다. 댓글 내용을 입력해주세요." });
    }

    try {
        const comment = await Comment.findByPk(commentId);
        // 404 Not found
        // 해당 id의 댓글이 존재하지 않음 (comment가 null일 것임)
        if (!comment) {
            return res.status(404).json({ errorMessage: "댓글이 존재하지 않습니다." });
        }
        try {
            // 401 Unauthorized
            // 해당 id의 댓글은 존재하지만 작성자 본인이 아님
            if (comment.userId != userId) {
                return res.status(401).json({ errorMessage: "작성자 본인만 수정이 가능합니다."})
            }
            // 200 Success
            comment.comment = content;
            await comment.save();
            return res.status(200).json({ message: "댓글을 수정하였습니다." });
        } catch (error) {
            // 400
            // 댓글 수정 등록 과정에서 실패
            console.log(error.message)
            return res.status(400).json({ errorMessage: "댓글 수정이 정상적으로 처리되지 않았습니다." });
        }
    } catch (error) {
        // 400
        // 이상의 모든 예외 케이스에서 처리하지 못한 에러가 발생
        console.log(error.message);
        return res.status(400).json({ errorMessage: "댓글 수정에 (예상치 못한 문제로) 실패하였습니다." });
    }
    // !! '본인의 댓글만' 수정할 수 있어야 한다! 로그인 된 아무나 할 수 있는 게 아니라..! => 처리함.
})


// DELETE - 댓글 삭제
// + 로그인 토큰에 해당하는 사용자가 작성한 댓글만 삭제 가능하도록 하기
// - 원하는 댓글을 삭제하기
router.delete('/comments/:_commentId', authMiddleware, async (req, res) => {
    const commentId = req.params._commentId;
    const { userId } = res.locals.user;

    try {
        const comment = await Comment.findByPk(commentId);

        // 404 Not found
        // 해당 id의 댓글이 존재하지 않음 (comment가 null일 것임)
        if (!comment) {
            return res.status(404).json({ errorMessage: "댓글이 존재하지 않습니다." });
        }

        // 401 Unauthorized
        // 해당 id의 댓글은 존재하나 작성자 본인이 아님
        if (comment.userId != userId) { // !==도 될까?
            return res.status(401).json({ errorMessage: "작성자 본인만 삭제가 가능합니다." });
        }

        try {
            // 200 Success
            const deleted = await comment.destroy();
            return res.status(200).json({ message: "댓글을 삭제하였습니다." });
        } catch (error) {
            // 400 Bad Request??
            // 댓글 삭제 중 일어난 내부적인 문제라면 bad request는 안 맞는데...
            console.log(error.message);
            return res.status(400).json({ errorMessage: "댓글을 삭제하는 중에 문제가 발생했습니다."});
        }

    } catch (error) {
        // 400 Bad Request(?)
        // 이상의 예외 케이스에서 처리하지 못한 에러가 발생
        console.log(error.message);
        return res.status(400).json({ errorMessage: "댓글 삭제에 (예상치 못한 문제로) 실패하였습니다." });
    }
})


module.exports = router;