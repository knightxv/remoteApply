import { Field, FieldMap, FieldArray } from '@cccd/corev2';
import { Article, ArticleComment, VoteAction } from './types';

function generateUUID(): string {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
}

export class ArticleService {
  @Field() articles!: FieldMap<Article>;
  @Field() comments!: FieldMap<Array<ArticleComment>>;
  @Field({ private: false }) topArticles!: FieldMap<Article>;
  @Field({ private: false }) allArticles!: FieldMap<Article>;
  async createArticle(articleTitle: string, articleContent: string): Promise<Article> {
    const article = {
      id: generateUUID(),
      author: '',
      title: articleTitle,
      content: articleContent,
      createTime: Date.now(),
      publishTime: Date.now(),
      score: 0,
      status: 1,
    };

    await this.upsertArticle(article);
    return article;
  }

  async createComment(articleId: string, content: string, user: string): Promise<ArticleComment> {
    const comment = {
      id: generateUUID(),
      articleId,
      user,
      content,
      createTime: Date.now(),
      publishTime: Date.now(),
    };

    await this.addComment(comment);
    return comment;
  }
  async getComments(articleId: string) {
    return new Array<string>();
  }

  async addComment(c: ArticleComment) {
    const comments = await this.comments.get(c.articleId) || [];
    comments.push(c);
    await this.comments.set(c.articleId, comments);
  }

  async upsertArticle(article: Article) {
    await this.articles.set(article.id, article);
    await this.allArticles.set(article.id, article);
  }

  async removeArticle(articleId: string) {
    await this.articles.del(articleId);
    await this.allArticles.del(articleId);
  }

  async voteArticle(articleId: string, action: VoteAction) {
    const article = await this.allArticles.get(articleId);
    if (article === undefined) {
      return;
    }

    // @fixme: should apply vote action base on previous vote status
    switch (action) {
      case VoteAction.Upvote:
        article.score++;
        break;
      case VoteAction.Downvote:
        article.score--;
        break;
      case VoteAction.Cancel:
        break;
    }
    await this.upsertArticle(article);
  }

  getArticle(articleId: string) {
    return this.articles.get(articleId);
  }

  // getTopRankArticleIds(startRank: number, endRank: number) {
  //   return this.topArticles.range(startRank, endRank);
  // }

  // async getTopRankArticles(startRank: number, endRank: number) {
  //   const ids = await this.getTopRankArticleIds(startRank, endRank);
  //   return Promise.all(ids.map((id) => this.getArticle(id)));
  // }
}
