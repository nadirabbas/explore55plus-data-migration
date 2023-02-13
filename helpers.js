const tables = require("./dump.json").filter(({ type }) => type === "table");

const getTable = (name) => tables.find(({ name: n }) => n === name)?.data;
const getPostsByType = (type, all = false) =>
  getTable("wp_mw19wgmlld_posts").filter(
    ({ post_type, post_status }) =>
      post_type === type && (all || post_status === "publish")
  );
const getPostById = (id) =>
  getTable("wp_mw19wgmlld_posts").find(({ ID }) => ID === id);
const getPostMetaByPostId = (postId = null, key = null, value = null) =>
  getTable("wp_mw19wgmlld_postmeta").find(
    ({ post_id, meta_key }) =>
      (post_id ? post_id === postId : true) &&
      (key ? meta_key === key : true) &&
      (value ? meta_value.toLowerCase() === value.toLowerCase() : true)
  );

const extractIds = (str) =>
  (
    (str?.includes("}")
      ? str?.match(/"[0-9]+"/g)?.map((a) => a.replace(/"/g, ""))
      : [str]) || []
  ).filter((i) => i);

module.exports = {
  getTable,
  getPostsByType,
  getPostById,
  getPostMetaByPostId,
  extractIds,
};
