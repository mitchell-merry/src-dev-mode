const log = (str) => console.log(`[SRC-DEV-MODE] ${str}`);

(async () => {
	log("Script running...");

	const isGamePage = !!document.querySelector("#leaderboardform");
	if(!isGamePage) return "This is not a game page! Aborting...";

	// get game name
	const gameAbbrev = window.location.href.split("/")[3].split("#")[0];
	log("Found game " + gameAbbrev);

	// fetch data on page load, check for error
	const game = await fetch(`https://www.speedrun.com/api/v1/games/${gameAbbrev}?embed=categories.variables`)
		.then(r => r.json()).then(r => r.data);
	if('status' in game) return game;
	log("Successfully fetched data!");

	// add the SDM data box to the page if not already on
	if(!document.querySelector('#sdm-data'))
	{
		const rightEl = document.querySelector('div.right');
	
		const data = document.createElement('div');
		data.id = 'sdm-data';
		rightEl.appendChild(data)
	}
	
	// setup styles
	const data = document.querySelector('#sdm-data');
	data.style = 'padding: 5px; text-align: left; font-size: 12px; white-space: pre-wrap; background-color: #00000055; border-radius: 5px; height: calc(100% - 35px)';

	const updateData = () => {
		// current active category tab element, or the current active category from misc.
		const activeTab = document.querySelector('.category-tab-name.active') ?? document.querySelector('.dropdown-item.category.active');
		
		// all the SRC subcategories (API) under the current category
		let variables = game.categories.data.find(cat => cat.id === activeTab.title).variables.data.filter(v => v.mandatory && !!v.values.default);

		// all the currently active subcategories (selected + visible)
		const activeSubcats = Array.from(document.querySelectorAll('body.dark .custom-radio-group input[type="radio"]:checked + label,.dropdown.variable > label'))
			.filter(label => label.parentElement.style.display !== "none");
		// the names of the current active subcategories
		const activeLabels = activeSubcats.map(t => t.textContent.trim());
		
		// mapping active subcategory labels to ids
		variables = variables.map((variable, i) => [variable.id, Object.entries(variable.values.values).find(([key, val]) => val.label === activeLabels[i])[0]]);
		
		// formatting and setting output
		const variablesLabels = variables.map(([variable, value]) => `\t${variable} - ${value}`).join('\n');
		data.textContent = `Game ID: ${game.id}\nCategory ID: ${activeTab.title}\nSubcategories:\n${variablesLabels}`;
	};

	// listen for potential updates
	document.querySelectorAll('.category.category-tab,.dropdown-item.category,.btn-group.custom-radio-group.variable,.dropdown.variable,.dropdown-menu')
		.forEach(el => el.addEventListener('click', () => updateData()))

	// set initial data
	updateData();

	return "Done!";
})().then(log);