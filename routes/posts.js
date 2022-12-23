/*
 "/posts/..." 라우터 정의
 + MongoDB(mongoose) => MySQL(sequelize)로 DB 변경함
*/

const express = require("express");
const router = express.Router();

// DB 모델 임포트
const { Post, User } = require("../models");

// 사용자 인증 미들웨어 임포트
const authMiddleware = require('../middlewares/auth-middleware');


// (req.params, req.body 등이) 빈 'Object'(객체)인지 테스트
function isEmptyObject(value) {
  return value // null과 undefined로 주어져도 에러를 던지지 않도록.
      && Object.keys(value).length === 0
      && value.constructor === Object;
}


// POST - 게시글 작성
// - 요청 예시: { "title": "안녕하세요 게시글 제목입니다.",  "content": "안녕하세요 content 입니다."}
// - 응답 예시: { "message": "게시글 작성에 성공하였습니다."}
router.post('/posts', authMiddleware, async (req, res) => {
    const { title, content } = req.body;
    const { userId } = res.locals.user;
        // => 로그인 검증 단계를 거쳐 이곳에 도달했을 터이므로 locals.user 데이터가 있을 것이 보장된다.

    // 412
    // body 데이터가 정상적으로 전달되지 않은 경우
    if (!title || !content) {
        return res.status(412).json({ errorMessage: "데이터 형식이 올바르지 않습니다." })
    }

    // # 412 Title의 형식이 비정상적인 경우
    // {"errorMessage": "게시글 제목의 형식이 일치하지 않습니다."}
    // # 412 Content의 형식이 비정상적인 경우
    // {"errorMessage": "게시글 내용의 형식이 일치하지 않습니다."}
    // => 이 예외들은 위의 "제목이나 내용이 없거나 빈 경우"에서 처리한 것이 아닌가?
    //    어떻게 다르게 처리하라는 것인지 잘 모르겠다.

    try {
        // 201 Created
        const posted = await Post.create({ userId, title, content });
        console.log(posted.dataValues);
        return res.status(201).json({ message: "게시글 작성에 성공하였습니다." });

    } catch (error) {
        // 400 Bad Request
        // 이상의 예외 케이스에서 처리하지 못한 에러
        console.log(error.message);
        return res.status(400).json({ errorMessage: "게시글 작성에 실패하였습니다." })
    }
});


// GET - 게시글 조회(목록)
// - postId, userId, (User의) nickname, title, createdAt, updatedAt, likes 조회하기
// - 작성 날짜 기준으로 내림차순 정렬하기
// + 로그인 토큰이 없어도 응답해주기
router.get('/posts', async (req, res) => {

    try {
        const post_list = await Post.findAll({
            raw: true,
            include: [{
                model: User,
                association: Post.belongsTo(User, {
                        // => User.hasMany(Post, )로 했을 때는 왜인지 에러가 발생.
                    foreignKey: 'userId',
                    constraints: false,
                }),
                attributes: []
            }],
            order: [
                ['createdAt', 'DESC']
            ],
            attributes: ['postId', 'userId', 'User.nickname', 'title', 'createdAt', 'updatedAt', 'likes']
        });
        // 200 Success
        return res.status(200).json({ data: post_list })

    } catch (error) {
        // 400 Bad Request
        // 이상의 예외 케이스에서 처리하지 못한 에러
        console.log(error.message);
        return res.status(400).json({ errorMessage: "게시글 조회에 실패하였습니다." })
    }
});


// GET - 게시글 상세 조회
// postId, userId, (User) nickname, title, content, createdAt, updatedAt, likes 조회하기
// (검색 기능이 아닙니다. 간단한 게시글 조회만 구현해주세요.)
// + 로그인 토큰이 없어도 응답해주기
router.get('/posts/:_postId', async (req, res) => {

    const postId = req.params._postId;

    try {
        const post_detail = await Post.findOne({
            raw: true,
            include: [{
                model: User,
                association: Post.belongsTo(User, { // Post.belongsTo(User) 대신 해봤는데 잘 될까. => 잘 안됨..!
                        // => User.hasMany(Post, )로 했을 때는 왜인지 에러가 발생.
                    foreignKey: 'userId',
                    constraints: false,
                }),
                attributes: []
            }],
            where: { postId },
            attributes: ['postId', 'userId', 'User.nickname', 'title', 'content', 'createdAt', 'updatedAt', 'likes']
        });
        // 200 Success
        return res.status(200).json({ data: post_detail })

    } catch (error) {
        // 400 Bad Request
        // 이상의 예외 케이스에서 처리하지 못한 에러
        console.log(error.message);
        return res.status(400).json({ errorMessage: "게시글 조회에 실패하였습니다." })
    }
});


// PUT - 게시글 수정
// + 로그인 토큰에 해당하는 사용자가 작성한 글만 수정 가능하도록 하기
// - 요청 예시: { "title": "안녕하세요 수정된 게시글 제목입니다.",  "content": "안녕하세요 content 입니다."}
// - 응답 예시: { "message": "게시글을 수정하였습니다."}
router.put('/posts/:_postId', authMiddleware, async (req, res) => {

    const postId = req.params._postId;
    const { title, content } = req.body;
    const { userId } = res.locals.user;

    // 412
    // body 데이터가 정상적으로 전달되지 않은 경우
    if (!title || !content) {
        return res.status(412).json({ errorMessage: "데이터 형식이 올바르지 않습니다." })
    }

    // # 412 Title의 형식이 비정상적인 경우
    // {"errorMessage": "게시글 제목의 형식이 일치하지 않습니다."}
    // # 412 Content의 형식이 비정상적인 경우
    // {"errorMessage": "게시글 내용의 형식이 일치하지 않습니다."}
    // => 이 예외들은 위의 "제목이나 내용이 없거나 빈 경우"에서 처리한 것이 아닌가?
    //    어떻게 다르게 처리하라는 것인지 잘 모르겠다.

    try {
        const post = await Post.findByPk(postId);
        // 404 Not Found
        // 해당 id의 게시글이 존재하지 않음
        if (!post) { // post === null
            return res.status(404).json({ errorMessage: "게시글이 존재하지 않습니다." });
        }
        // => 이것은 이미 게시판에 '나타나있는' 게시글의 수정 버튼을 눌렀을 것이므로 검사하지 않아도 될 것 같다.

        // 401 Unauthorized
        // 해당 id의 게시글은 존재하지만 작성자 본인이 아님
        if (post.userId != userId) {
            return res.status(401).json({ errorMessage: "작성자 본인만 수정이 가능합니다."})
        }

        // 200 Success
        post.content = content;
        await post.save();
        return res.status(200).json({ "message": "게시글을 수정하였습니다." });

    } catch (error) {
        // 400 Bad Request
        // 이상의 예외 케이스에서 처리하지 못한 에러
        console.log(error.message);
        return res.status(400).json({ errorMessage: "게시글 수정에 실패하였습니다." })
    }
})


// DELETE - 게시글 삭제
// + 로그인 토큰에 해당하는 사용자가 작성한 글만 삭제 가능하도록 하기
// - 응답 예시: { "message": "게시글을 삭제하였습니다." }
router.delete('/posts/:_postId', authMiddleware, async (req, res) => {
    const postId = req.params._postId;
    const { userId } = res.locals.user;

    try {
        const post = await Post.findByPk(postId);

        // 404 Not found
        // 해당 id의 게시글이 존재하지 않음
        if (!post) { // post === null
            return res.status(404).json({ errorMessage: "게시글이 존재하지 않습니다." });
        }

        // 401 Unauthorized
        // 해당 id의 게시글은 존재하나 작성자 본인이 아님
        if (post.userId != userId) { // !==도 될까?
            return res.status(401).json({ errorMessage: "작성자 본인만 삭제가 가능합니다." });
        }

        // 200 Success
        const deleted = await post.destroy();
        return res.status(200).json({ message: "게시글을 삭제하였습니다." });

    } catch (error) {
        // 400 Bad Request
        // 이상의 예외 케이스에서 처리하지 못한 에러가 발생
        console.log(error.message);
        return res.status(400).json({ errorMessage: "댓글 삭제에 실패하였습니다." });
    }
})


// PUT - 게시글에 좋아요 하기
// - 로그인 토큰을 전달했을 때에만 좋아요 할 수 있게 하기
// - 로그인 토큰에 해당하는 사용자가 좋아요 한 글에 한해서, 좋아요 취소 할 수 있게 하기
// - 게시글 목록 조회시 글의 좋아요 갯수도 같이 표출하기
router.put('/posts/:postId/like', authMiddleware, async (req, res) => {
    // 1. 게시글에 좋아요 개수 올리고
    //    사용자에게 '좋아요'한 게시글 번호들을 들고 있게 하기
    //    => 사용자 측에서는 게시글 번호를 문자열로 뒤에 붙이면서 계속 추가할 수 있게 하면 되겠다.
    // 아니면
    // 2. 게시글 좋아요 항목에 사용자 ID들을 저장하기..!! 이게 근데 합리적인가?
    //    => 아니, 사용자가 게시글 번호들을 들고 있게 하나, 게시글이 사용자 번호들을 들고 있게 하나,
    //      거기서 거기지..! 그래도 한 사용자가 좋아요를 3천개씩 할 경우보다는 한 게시글이 좋아요를
    //      3천개씩 들고 있어야 할 경우가 더 많을 테니까... 데이터 테이블을 최대한 날씬하게 만들려면
    //      사용자 측에서 게시글 번호를 들고 있는 쪽이 쬐끔 더 낫겠다.
    //    => 1번과 2번을 동시에 하는 것도 생각해봤지만, 현재로썬 '한 사용자가 좋아요한 게시글 모아보기'
    //      API를 만드는 것밖에 요구사항이 없다. 굳이 확장성을 고려해서 과한 정보를 저장하느니,
    //      그냥 게시글 '좋아요' 란에는 좋아요 개수만 깔끔히 저장하는 게 낫겠다는 결론이다.
    // 아니면
    // 3. '좋아요' 기록용 테이블을 따로 만든다. 이 경우 감이 안 잡힌다.

    // 1번 방식으로 하면 좋아요/취소 때마다 게시글 수정, 사용자 수정 이렇게 두 번을 해야 한다.
    // 2번 방식은 해당 사용자가 게시글 '좋아요'리스트에 든 사용자인지만 테스트해서 맞으면
    //      그 리스트에서 사용자ID를 빼면 된다. 다시 좋아요 할 때는 다시 넣으면 되고.

    // 아... 밑의 '자기가 좋아요한 게시글 목록을 조회'하도록 하는 걸 보면 1번 방식을 써야겠다.

})

// GET - 자기가 좋아요한 게시글 목록 조회
// - 로그인 토큰을 전달했을 때에만 좋아요 게시글 조회할 수 있게 하기
// - 로그인 토큰에 해당하는 사용자가 좋아요 한 글에 한해서, 조회할 수 있게 하기
// - 제일 좋아요가 많은 게시글을 맨 위에 정렬하기
router.get('/posts/like', authMiddleware, async (req, res) => {

})


module.exports = router;