# Issues
1. Sensor health chart displays nothing at https://papushome.us/plant-care
2. logs are noisy and it's not clear which service corresponds to which actual data. When I visit http://100.122.11.16:3030/d/logs-overview/logs-overview?orgId=1&refresh=30s&var-service=redwood I see grafana, loki, ollama, promtail, redwood, and redwood-db. It's hard to know which logs relate to graphql, mqtt, hardware, or the db
3. nginx.conf is still in the repo, but I think that is unused now right?
4. .env.example, and .env.defaults don't have any of the variables from .env that are needed to run the app
5. We've experimented with several models and landed on qwen2.5:7b because it offered the best balance of speed and accuracy. Llama 3.2 just din't follow prompt instructions closely enough. Gemma4 and qwen 3 were too big for my gpu.


# Nice to have for marketing this as an open source project
1. Add more services to web-agents (book flights, buy from amazon, play and suggest music, etc.)
2. Working physical robot
3. High quality demo video
4. Onboarding UI flow for the robot (interview questions, model selection, service selection (e.g. mind-body, wyze, etc.))
5. Creating npm packages for the parts of the repo that are genuinely shipable as packages. (a) api, mqtt, and microcontroller networking. (b) Home robot code to let anyone install an npm package and launch and configure their own home robot
6. Media storage optimizations and thumbnbails for scalability in displaying on the frontend.
