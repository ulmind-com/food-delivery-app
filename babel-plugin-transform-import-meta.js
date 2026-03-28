/**
 * Custom Babel plugin to transform `import.meta` expressions
 * into compatible code for Metro Web bundler.
 *
 * Transforms:
 *   import.meta.env         → process.env
 *   import.meta.env.MODE    → process.env.NODE_ENV
 *   import.meta.url         → ""
 *   import.meta             → {}
 */
module.exports = function () {
  return {
    visitor: {
      MetaProperty(path) {
        const { node } = path;
        // Only handle import.meta
        if (node.meta.name === 'import' && node.property.name === 'meta') {
          const parent = path.parentPath;

          // import.meta.env.MODE → process.env.NODE_ENV
          if (
            parent.isMemberExpression() &&
            parent.node.property.name === 'env'
          ) {
            const grandParent = parent.parentPath;
            if (
              grandParent.isMemberExpression() &&
              grandParent.node.property.name === 'MODE'
            ) {
              grandParent.replaceWithSourceString('process.env.NODE_ENV');
              return;
            }
            // import.meta.env → process.env
            parent.replaceWithSourceString('process.env');
            return;
          }

          // import.meta.url → ""
          if (
            parent.isMemberExpression() &&
            parent.node.property.name === 'url'
          ) {
            parent.replaceWithSourceString('""');
            return;
          }

          // import.meta → {}
          path.replaceWithSourceString('({})');
        }
      },
    },
  };
};
