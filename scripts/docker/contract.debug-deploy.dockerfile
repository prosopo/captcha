FROM paritytech/contracts-ci-linux:production
WORKDIR /contracts
# ENV CONTRACT_ARGS "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 1000000000000"
# ENV SUBSTRATE_URL "ws://localhost:9944"
# ENV SURI "//Alice"
# ENV ENDOWMENT 2000000000000
# ENV CONSTRUCTOR "default"

ARG CONTRACT_PATH
ARG CONTRACT_NAME
ARG CONTRACT_ARGS
ARG SUBSTRATE_URL
ARG SURI
ARG ENDOWMENT
ARG CONSTRUCTOR

RUN echo $CONTRACT_ARGS

VOLUME ["/contracts"]

COPY $CONTRACT_PATH $CONTRACT_NAME

RUN echo $(ls -l "/contracts/$CONTRACT_NAME")

RUN echo "derp" > /contracts/test.txt

RUN cat /contracts/test.txt

WORKDIR "/contracts/$CONTRACT_NAME"

# FROM scratch AS export-stage
# COPY --from=build-stage /contracts /contracts/

# 
RUN cargo contract instantiate "./target/ink/${CONTRACT_NAME}.wasm" --args $CONTRACT_ARGS --constructor "$CONSTRUCTOR" --suri "$SURI" --value $ENDOWMENT --url "$SUBSTRATE_URL" --manifest-path "./Cargo.toml" --verbose

