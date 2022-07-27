export enum VoteAction {
  Upvote = 'upvote',
  Downvote = 'downvote',
  Cancel = 'cancel',
}

export interface Article {
  id: string;
  author: string;
  title: string;
  content: string;
  createTime: number;
  publishTime: number;
  score: number; // score calculated by upvote and downvote
  status: number; // 0: draft, 1: published, 2: reviewed
}

export interface ArticleComment {
  id: string;
  articleId: string;
  content: string;
  user: string;
  createTime: number;
  publishTime: number;
}
