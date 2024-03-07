const toggleChildrenTableClassName = 'toggle-children-table';

export default {
	methods: {
		generateToggleTable() {
			this.$nextTick(() => {
				setTimeout(() => {
					// 表格折叠打开
					[...document.getElementsByClassName('have-children-tr')].forEach(tr => {
						const firstTD = tr.firstChild;
						const firstTDChild = firstTD.firstChild;
						if (!firstTDChild.className || firstTDChild.className.indexOf(toggleChildrenTableClassName) === -1) {
							const firstTDStyle = firstTD.getAttribute('style') || ''
							firstTD.setAttribute('style', `${firstTDStyle}; padding-left: 0;`);

							const i = document.createElement('i');
							i.setAttribute('class', `${toggleChildrenTableClassName} opened`);
							i.onclick = function () {
								const childrenTable = this.parentElement.parentElement.nextElementSibling;
								const isHidden = childrenTable.getAttribute('hidden');
								if (isHidden === null) {
									this.classList.remove('opened');
									childrenTable.setAttribute('hidden', '');
								} else {
									this.classList.add('opened');
									childrenTable.removeAttribute('hidden');
								}
							};

							firstTD.insertBefore(i, firstTDChild);
						}
					});
				}, 100);
			});
		},
	},
	watch: {
		$route() {
			this.generateToggleTable();
		},
	},
	mounted() {
		this.generateToggleTable();
	},
};
//# sourceMappingURL=clientRootMixin.js.map
