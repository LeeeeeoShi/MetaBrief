import { rssCrawler } from './_rss'

export const deepmind = rssCrawler('Google DeepMind', '官方博客', 'https://deepmind.google/blog/rss/')
export const metaai = rssCrawler('Meta AI', '官方博客', 'https://ai.meta.com/blog/rss/')
export const anthropic = rssCrawler('Anthropic', '官方博客', 'https://www.anthropic.com/blog/rss')
export const msazure = rssCrawler('Microsoft Azure AI', '官方博客', 'https://azure.microsoft.com/en-us/blog/rss/')
export const nvidia = rssCrawler('NVIDIA Research', '官方博客', 'https://developer.nvidia.com/blog/rss')
