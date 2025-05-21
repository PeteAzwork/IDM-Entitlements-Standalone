This repo is to bootstrap a Ping IDM instance as a Docker Container to be spun up as part of an Entitlements Demo.

This will set up a vanilla Ping IDM 7.5 instance with:
- File Based Configuration
- In Memory Persistence of Configuration Changes (Note: Any Changes made will *not* survive a reboot)
- Local PingDS instance


In order to apply Ping IDM configurations:

Managed Objects:
- Overwrite /conf/managed.json with the demo-specific managed.json

Triger scripts
- Copy the demo-specific scripts into /scripts

Custom Endpoints
- Copy the demo-specific custom endpoint scripts into /conf

This will ensure that these configurations are bundled into the deployed container.

Steps to build container locally

1. Clone the ForgeOps-Extras Repository at https://github.com/ForgeRock/forgeops-extras.git
2. Build the Java-17 docker image in /images/java-17 (Java-21 for IDM 8+) using

docker build --tag idm-standalone/java-17 .

3. Now build this container with

docker build . --file bin/Custom.Dockerfile --tag idm-standalone/idm:7.5.0



Running IDM

By default, IDM listens on port 8080, so testing a container locally can be done with:

docker run -p 8081:8080 idm-standalone/idm:7.5.0

Open your browswer to:

http://localhost:8081/#/login

Username: openidm-admin
Password: openidm-admin

