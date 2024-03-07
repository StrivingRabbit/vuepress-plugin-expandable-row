const toggleChildrenTableClassName = 'toggle-children-table';

export default {
	methods: {
		generateToggleTable() {
			// 表格折叠打开
			[...document.getElementsByClassName('have-children-tr')].forEach(tr => {
				const firstTD = tr.firstChild;
				const firstTDChild = firstTD.firstChild;
				if (!firstTDChild.className || firstTDChild.className.indexOf(toggleChildrenTableClassName) === -1) {
					const i = document.createElement('i');
					i.setAttribute('class', `${toggleChildrenTableClassName} opened`);
					firstTD.insertBefore(i, firstTDChild);
				}
			});
			[...document.getElementsByClassName(toggleChildrenTableClassName)].forEach(toggleChildrenTable => {
				if (toggleChildrenTable) {
					toggleChildrenTable.onclick = function () {
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
				}
			});
		},
	},
	mounted() {
		this.$nextTick(() => {
			setTimeout(this.generateToggleTable, 100);
		});
	},
};
//# sourceMappingURL=clientRootMixin.js.map
