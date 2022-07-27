import { remoteProxy, RemoteField } from '@cccd/core';
import { FieldMap } from '@cccd/corev2';

import type { ArticleService as IArticleService, Article, ArticleComment, VoteAction } from '@cccd/demo-services';
@remoteProxy('iojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1w=')
export class ArticleService implements IArticleService {
  @RemoteField()
  articles!: FieldMap<Article>;
  @RemoteField()
  comments!: FieldMap<Array<ArticleComment>>;
  @RemoteField()
  topArticles!: FieldMap<Article>;
  @RemoteField()
  allArticles!: FieldMap<Article>;
  createArticle(articleTitle: string, articleContent: string): Promise<Article> {
    throw new Error('Method not implemented.');
  }
  createComment(articleId: string, content: string, user: string): Promise<ArticleComment> {
    throw new Error('Method not implemented.');
  }
  getComments(articleId: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  addComment(c: ArticleComment): Promise<void> {
    throw new Error('Method not implemented.');
  }
  upsertArticle(article: Article): Promise<void> {
    throw new Error('Method not implemented.');
  }
  removeArticle(articleId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  voteArticle(articleId: string, action: VoteAction): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getArticle(articleId: string): Promise<Article> {
    throw new Error('Method not implemented.');
  }
}