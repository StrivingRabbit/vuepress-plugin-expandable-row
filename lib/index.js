const path = require('path');

module.exports = (options, ctx) => {
	return {
		name: 'vuepress-plugin-expandable-row',
		define() {
			return {};
		},
		extendMarkdown(md) {
			md.use(require('./expandable-row').markdownIt, options);
		},
		enhanceAppFiles: path.resolve(__dirname, 'enhanceApp.js'),
		clientRootMixin: path.resolve(__dirname, 'clientRootMixin.js'),
	};
};
