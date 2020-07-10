import SkyAppear from './SkyAppear.vue';

const defaults = {
	registerComponents: true,
};

export { SkyAppear };

export default function install(Vue, options) {
	if (install.installed === true) {
		return;
	}

	const { registerComponents } = Object.assign({}, defaults, options);

	if (registerComponents) {
		Vue.component(SkyAppear.name, SkyAppear);
	}
};