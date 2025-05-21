#
# Copyright 2020-2023 ForgeRock AS. All Rights Reserved
#

# Build custom IDM Docker image:
# 1. Extract OpenIDM ZIP archive
# 2. cd /path/to/openidm
# 3. docker build -f bin/Custom.Dockerfile -t idm:latest .

FROM gcr.io/forgerock-io/java-17:latest

# fonts-dejavu font needed by Flowable workflow engine
RUN apt-get update && \
    apt-get install -y fonts-dejavu

COPY --chown=forgerock:root . /opt/openidm

WORKDIR /opt/openidm

EXPOSE 8080

USER 11111

ENTRYPOINT ["/opt/openidm/bin/docker-entrypoint.sh", "openidm"]