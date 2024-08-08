                    set -eux pipefail # stop on errors, print commands, fail on pipe fails

                    docker rm -f $(docker ps -qa -f name=js_server) || true
                    docker rm -f $(docker ps -qa -f expose=80) || true

                    npm run build -w @prosopo/procaptcha-bundle

                    NODE_ENV=development npm run bundle -w @prosopo/procaptcha-bundle

                    VERSION=$(npm view @prosopo/util | grep latest | cut -f2 -d ' ')

                    # Set the JS location in the container
                    JS_FOLDER="/usr/share/nginx/html/js"

                    # Get the most recent version of the js_server image
                    docker pull prosopo/js_server:"$VERSION"

                    # Create a temporary container from the latest image
                    echo "Building Docker image..."
                    OLD_CONTAINER_ID=$(docker create prosopo/js_server:"$VERSION")

                    # Remove the old js temp folder
                    rm -rf ./js_bundles_host_temp

                    # Copy out the old files
                    docker cp $OLD_CONTAINER_ID:$JS_FOLDER ./js_bundles_host_temp

                    # Build the new image
                    docker build --file ./docker/images/js.server.dockerfile . -t prosopo/js_server:dev --no-cache

                    # Run the new image
                    NEW_CONTAINER_ID=$(docker create prosopo/js_server:dev)

                    # Copy the legacy files across
                    docker cp ./js_bundles_host_temp/ $NEW_CONTAINER_ID:$JS_FOLDER/

                    # Copy the new bundle files to the container into a folder with the version name
                    docker cp packages/procaptcha-bundle/dist/bundle/. $NEW_CONTAINER_ID:$JS_FOLDER

                    # Start the new container
                    docker start $NEW_CONTAINER_ID

                    # Move procaptcha.bundle.js
                    docker exec $NEW_CONTAINER_ID mv $JS_FOLDER/procaptcha.bundle.js $JS_FOLDER/procaptcha.bundle.dev.js

                    # Symlink JS_FOLDER/procaptcha.bundle.js to JS_FOLDER/procaptcha.bundle.VERSION.js
                    docker exec $NEW_CONTAINER_ID ln -sf $JS_FOLDER/procaptcha.bundle.dev.js $JS_FOLDER/procaptcha.bundle.js

                    # Commit the changes to the container
                    docker commit $NEW_CONTAINER_ID prosopo/js_server:dev

                    docker rm -f $NEW_CONTAINER_ID
                    docker rm -f $OLD_CONTAINER_ID

                    # Check this new docker image works locally
                    docker run -d -p 3080:80 prosopo/js_server:dev
