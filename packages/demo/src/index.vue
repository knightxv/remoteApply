<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { base64ToUint8Array, RemoteRole, RoleManager, keyPair } from '@cccd/core';
import { Bnrtc } from '@cccd/lib-bnrtc';
import { Article, ArticleComment, VoteAction } from '@cccd/demo-services';
// import { ArticleUser } from './article/client';
// import { remoteAdminRole } from './boot';
import { Boot, moduleMap } from './allClient';
import { SignService } from './services';
import { Resolve } from '@bfchain/util';

type LocalArticle = Article & { show?: boolean };
const boot = Resolve(Boot, moduleMap);
boot.steup();

const signUser = Resolve(SignService, moduleMap);
// const articleUser = new ArticleUser();
const pubKey = ref('请稍后');
const records = ref([] as string[]);
const articles = ref([] as LocalArticle[]);
const comments = ref([] as ArticleComment[]);
const selectedArticle = ref<LocalArticle>();
const pendingArticle = reactive({ title: '', content: '' });

const sign = async () => {
  const signResult = await signUser.sign();
  console.log('signResult', signResult);
  await updateRecords();
};
const updateRecords = async () => {
  records.value = await signUser.signRecords();
};
// const updateArticles = async () => {
//   const x = await articleUser.getTopArticles(0, 100);
//   articles.value = x.filter((x) => x) as LocalArticle[];
//   articleMap.value.clear();
//   x.forEach((a) => articleMap.value.set(a!.id, a!));
// };
// const createArticle = async () => {
//   const x = await articleUser.createArticle(pendingArticle.title, pendingArticle.content);
// };
// const voteUp = async (id: string) => {
//   await articleUser.voteArticle(id, VoteAction.Upvote);
// };
// const voteDown = async (id: string) => {
//   await articleUser.voteArticle(id, VoteAction.Downvote);
// };
const articleMap = ref(new Map<string, Article>());
onMounted(async () => {
  const bnrtc = new Bnrtc('127.0.0.1', 19888);
  pubKey.value = boot.loginRole!.publicKeyBase64;
  await bnrtc.login(boot.loginRole!.publicKeyBase64);
  await updateRecords();
  // await updateArticles();

  // // 订阅文章列表
  // for await (const [[articleId], v] of roleManager.subscription<Article>(remoteAdminRole, 'article/:id')) {
  //   articleMap.value.set(v.id, v);
  //   articles.value = [...articleMap.value.values()].sort((a, b) => b.score - a.score);
  //   selectedArticle.value && (selectedArticle.value = articleMap.value.get(selectedArticle.value!.id));
  // }
});

// const selectArticle = async (a: LocalArticle) => {
//   selectedArticle.value = a;
//   comments.value = await articleUser.getComments(a.id);
// };
// const commentContent = ref('');
// const comment = async () => {
//   await articleUser.createComment(selectedArticle.value!.id, commentContent.value, pubKey.value);
// };
</script>
<template>
  <p>
    当前登录者：<span>{{ pubKey }}</span>
  </p>

  <button @click="sign()">签到</button>
  <p>签到记录</p>
  <ul>
    <li v-for="r in records">{{ new Date(r).toLocaleString() }}</li>
  </ul>

  <!-- <div v-if="!selectedArticle">
    <p>文章列表</p>
    <ul class="article-list">
      <li v-for="r in articles">
        <span @click="selectArticle(r)">标题:{{ r.title }}</span>
      </li>
    </ul>
    <div class="create-article">
      <input v-model="pendingArticle.title" type="text" placeholder="请输入文章标题" />
      <textarea v-model="pendingArticle.content" placeholder="请输入文章内容"></textarea>
      <button @click="createArticle()">创建文章</button>
    </div>
  </div>
  <div v-else class="article-detail">
    <a @click="selectedArticle = undefined">返回</a>
    <span>内容:{{ selectedArticle.content }}</span>
    <span>分数:{{ selectedArticle.score }}</span>
    <div class="action">
      <button @click="voteUp(selectedArticle!.id)">赞</button>
      <button @click="voteDown(selectedArticle!.id)">踩</button>
    </div>
    <div class="comment-list">
      <p>评论({{ comments.length }})</p>
      <ul>
        <li v-for="c in comments">
          <p>{{ new Date(c.publishTime).toLocaleString() }}</p>
          <p>{{ c.content }}</p>
        </li>
      </ul>
    </div>
    <div class="action">
      <input type="text" v-model="commentContent" placeholder="说点什么" /><button @click="comment()">发布评论</button>
    </div>
  </div> -->
</template>
<style scoped lang="scss">
.article-list {
  li > * {
    cursor: pointer;
  }

  li > div {
    display: flex;
    flex-direction: column;
  }
}

.article-detail {
  display: flex;
  flex-direction: column;

  a {
    text-decoration: underline;
    color: blue;
    cursor: pointer;
  }

  .action {
    display: flex;
  }
}

.create-article {
  padding-top: 10px;
  display: flex;
  flex-direction: column;
}
</style>
