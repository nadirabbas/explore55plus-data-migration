const client = require("./client");
const {
  amenities,
  states,
  areas,
  externalVideos,
  categories,
  posts,
} = require("./data");

const _ = require("lodash");

const main = async () => {
  await client.delete({
    query: '*[_type in ["article"]]',
  });

  let transaction = client.transaction();
  // amenities.forEach((a) => transaction.createOrReplace(a));
  // states.forEach((s) => transaction.createOrReplace(s));
  // areas.forEach((a) => transaction.createOrReplace(a));
  // externalVideos.forEach((v) => transaction.createOrReplace(v));
  // categories.forEach((c) => transaction.createOrReplace(c));
  posts.forEach((p) => transaction.createOrReplace(p));
  transaction.commit();
};

main();

// console.log(posts);
