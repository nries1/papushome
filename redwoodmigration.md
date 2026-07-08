# Background
I just added redwoodjs to this repo because I want to offload the crud app portion of the app onto redwoodJS' react, graphql, and prisma stack. The problem is that redwood needs yarn, so I want to migrate my existing services to use yarn instead of npm. The pre-redwood services are in the server/ directory, robot-vision-publisher, and robot-vision-worker. And are all managed with docker-compose.yml

# Implementation
Do not commit anything. Just let me know when the diff is ready and I will commit it.

## Diff 1
1. Spin up the old database (pre-redwood) and obtain the existing database schema by execing into the docker container for the old db `docker exec -it papu-db-1 psql -U user -d plants`
2. Add all of the existing database schema into api/db/schema.prisma
3. Spin up the psql database in this repo with docker
3. Migrate prisma
3. Seed the new prisma db with all of the data from the old db
