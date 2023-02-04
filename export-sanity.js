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

const mi = (url) =>
  url
    ? {
        _type: "mainImage",
        asset: getAsset(url),
      }
    : undefined;

const main = async () => {
  await client.delete({
    query:
      '*[_type in ["community", "amenity", "state", "area", "externalVideo", "category", "post"]]',
  });

  let transaction = client.transaction();
  amenities.forEach((a) => transaction.createOrReplace(a));
  states.forEach((s) => transaction.createOrReplace(s));
  areas.forEach((a) => transaction.createOrReplace(a));
  externalVideos.forEach((v) => transaction.createOrReplace(v));
  categories.forEach((c) => transaction.createOrReplace(c));
  posts.forEach((p) => {
    const post = {
      ...p,
      heroImage: p.heroImage
        ? {
            _type: "mainImage",
            asset: getAsset(p.heroImage),
          }
        : undefined,
    };
    transaction.createOrReplace(post);
  });
  communities.forEach((c) => {
    const community = {
      ...c,
      heroImage: mi(c.heroImage),
      amenityImages: c.amenityImages.map((i, idx) => ({
        ...mi(i.image),
        caption: i.caption,
        _key: "amic" + idx + c._id,
      })),
      financialImage1: mi(c.financialImage1),
      financialImage2: mi(c.financialImage2),
    };

    transaction.createOrReplace(community);
  });
  transaction.commit();
};

main();

// console.log(posts);
