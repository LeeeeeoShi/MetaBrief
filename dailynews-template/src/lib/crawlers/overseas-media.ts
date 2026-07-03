import { rssCrawler } from './_rss'

export const mittechreview = rssCrawler('MIT Tech Review', '海外媒体', 'https://www.technologyreview.com/feed/')
export const wired = rssCrawler('WIRED', '海外媒体', 'https://www.wired.com/feed/rss')
export const venturebeat = rssCrawler('VentureBeat', '海外媒体', 'https://venturebeat.com/feed/')
export const cnet = rssCrawler('CNET', '海外媒体', 'https://www.cnet.com/rss/news/')
export const reuters = rssCrawler('Reuters AI', '海外媒体', 'https://www.reuters.com/technology/artificial-intelligence/rss')
