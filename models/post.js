'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Post extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Post.init({
    postId: {
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    likes: {
      defaultValue: 0,
      type: DataTypes.INTEGER
    },
    userId: DataTypes.INTEGER // 외래키 지정 안 해도 될 듯 하다.
            // 어차피 '로그인한 (유효한 유저ID를 가진) 사용자'만 작성이 가능할테니..!
  }, {
    sequelize,
    modelName: 'Post',
  });
  return Post;
};