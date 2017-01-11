FROM node:6.9-onbuild

ENTRYPOINT ["node", "/usr/src/app/index.js"]
