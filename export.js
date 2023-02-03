const client = require("./client");
const {
  amenities,
  states,
  areas,
  externalVideos,
  categories,
  posts,
  getAsset,
  communities,
} = require("./data");

const _ = require("lodash");

const main = async () => {
  await client.delete({
    query: '*[_type in ["community"]]',
  });

  let transaction = client.transaction();
  // amenities.forEach((a) => transaction.createOrReplace(a));
  // states.forEach((s) => transaction.createOrReplace(s));
  // areas.forEach((a) => transaction.createOrReplace(a));
  // externalVideos.forEach((v) => transaction.createOrReplace(v));
  // categories.forEach((c) => transaction.createOrReplace(c));
  // posts.forEach((p) => {
  //   const post = {
  //     ...p,
  //     heroImage: p.heroImage
  //       ? {
  //           _type: "mainImage",
  //           asset: getAsset(p.heroImage),
  //         }
  //       : undefined,
  //   };
  //   transaction.createOrReplace(post);
  // });
  communities.slice(0, 3).forEach((c) => {
    const community = {
      ...c,
      heroImage: c.heroImage
        ? {
            _type: "mainImage",
            asset: getAsset(c.heroImage),
          }
        : undefined,
    };

    console.log(c.heroImage);

    transaction.createOrReplace(community);
  });
  transaction.commit();
};

main();

// console.log(posts);
