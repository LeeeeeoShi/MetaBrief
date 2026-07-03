import { techcrunch } from './techcrunch'
import { theverge } from './theverge'
import { hackernews } from './hackernews'
import { thirtySixKr } from './thirtySixKr'
import { googlenews } from './googlenews'
import { openai } from './openai'
import { zhihu } from './zhihu'
import { liangziwei, tmtpost } from './chinese-media'
import { mittechreview, wired, venturebeat, cnet, reuters } from './overseas-media'
import { deepmind, metaai, anthropic, msazure, nvidia } from './official-blogs'
import { huggingface, reddit } from './academic'
import { bingnews, baidunews } from './search-engines'
import type { CrawlerSource } from '../types'

export const allCrawlers: CrawlerSource[] = [
  // == 海外媒体 ==
  techcrunch,
  theverge,
  mittechreview,
  wired,
  venturebeat,
  cnet,
  reuters,

  // == 国内媒体 ==
  thirtySixKr,
  liangziwei,
  tmtpost,

  // == 官方博客 ==
  openai,
  deepmind,
  metaai,
  anthropic,
  msazure,
  nvidia,

  // == 社区 ==
  hackernews,
  zhihu,
  reddit,

  // == 学术 ==
  huggingface,

  // == 搜索引擎 ==
  googlenews,
  bingnews,
  baidunews,
]
