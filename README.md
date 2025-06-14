# StreamWatch
[![StreamWatch Image](.github/StreamWatch.png)](https://docs.pstream.org)  

**I *do not* endorse piracy of any kind I simply enjoy programming and large user counts.**


## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FStreamWatch%2FStreamWatch)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/StreamWatch/StreamWatch)

**NOTE: To self-host, more setup is required. Check the [docs](https://docs.pstream.org) to properly set up!!!!**


## Links And Resources
| Service        | Link                                                             | Source Code                                              |
|----------------|------------------------------------------------------------------|----------------------------------------------------------|
| StreamWatch Docs | [docs](https://docs.pstream.org)                          | [source code](https://github.com/StreamWatch/docs)        |
| Extension      | [extension](https://docs.pstream.org/extension)                | [source code](https://github.com/StreamWatch/browser-ext) |
| Proxy          | [simple-proxy](https://docs.pstream.org/proxy)              | [source code](https://github.com/StreamWatch/sudo-proxy)  |             
| Backend        | [backend](https://server.fifthwit.net)                    | [source code](https://github.com/StreamWatch/backend)     |
| Frontend       | [StreamWatch](https://docs.pstream.org/instances)                | [source code](https://github.com/StreamWatch/StreamWatch)        |
| Weblate        | [weblate](https://weblate.pstream.org)         | |

***I provide these if you are not able to host yourself, though I do encourage hosting the frontend.***


## Referrers
- [FMHY (Voted as #1 multi-server streaming site of 2024)](https://fmhy.net)
- [Piracy Subreddit Megathread](https://www.reddit.com/r/Piracy/s/iymSloEpXn)
- [Toon's Instances](https://erynith.github.io/movie-web-instances)
- [Entertainment Empire](https://discord.gg/8NSDNEMfja)
- Search Engines: DuckDuckGo, Bing, Google
- Rentry.co


## Running Locally
Type the following commands into your terminal / command line to run StreamWatch locally
```bash
git clone https://github.com/StreamWatch/StreamWatch.git
cd smov
git pull
pnpm install
pnpm run dev
```
Then you can visit the local instance [here](http://localhost:5173) or, at local host on port 5173.


## Updating a StreamWatch Instance
To update a StreamWatch instance you can type the below commands into a terminal at the root of your project.
```bash
git remote add upstream https://github.com/StreamWatch/StreamWatch.git
git fetch upstream # Grab the contents of the new remote source
git checkout <YOUR_MAIN_BRANCH>  # Most likely this would be `origin/production`
git merge upstream/production
# * Fix any conflicts present during merge *
git add .  # Add all changes made during merge and conflict fixing
git commit -m "Update StreamWatch instance (merge upstream/production)"
git push  # Push to YOUR repository
```


## Contact Me / Discord
[Discord](https://discord.gg/7z6znYgrTG)
