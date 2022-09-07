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

	// Add tooltips
	const categoryTabs = document.querySelectorAll(".category-tab-name,.dropdown-item.category");

	for(const tab of categoryTabs)
	{
		const tabName = tab.textContent.trimEnd();
		if(tabName === "Misc.") continue;

		const cat = game.categories.data.find(c => c.name === tabName);
		const categoryId = cat?.id ?? "Unknown id"

		tab.setAttribute('title', categoryId);
	}

	// add the SDM data box to the page if not already on
	if(!document.querySelector('#sdm-data'))
	{
		const rightEl = document.querySelector('div.right');
	
		const data = document.createElement('div');
		data.id = 'sdm-data';

		const text = document.createElement('div');
		text.id = 'sdm-text';
		
		data.appendChild(text)
		rightEl.appendChild(data)
	}
	
	// setup styles
	const data = document.querySelector('#sdm-data');
	if(!data) return 'data elemenet brokey (null)';
	data.style = 'padding: 5px; text-align: left; font-size: 12px; white-space: pre-wrap; background-color: #00000055; border-radius: 5px; height: calc(100% - 35px); position: relative';
	
	const text = document.querySelector('#sdm-text');

	if(!document.querySelector('#sdm-copy'))
	{
		const copyButton = document.createElement('a');
		copyButton.id = 'sdm-copy';
		data.appendChild(copyButton);
	}

	const copyButton = document.querySelector('#sdm-copy');
	if(!copyButton) return 'copy brokey';

	copyButton.textContent = '⎘';
	copyButton.title = 'Copy JSON to clipboard';
	copyButton.style.position = 'absolute';
	copyButton.style.top = '5px';
	copyButton.style.right = '5px';
	copyButton.style.color = 'var(--theme-legacy-button-dark)';
	copyButton.style.fontSize = '20px';
	copyButton.style.cursor = 'pointer';
	copyButton.addEventListener('click', () => navigator.clipboard.writeText(data.dataset.json));

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
		
		const leaderboardPartial = {
			game: game.id,
			category: activeTab.title,
			variables: Object.fromEntries(variables)
		}
		data.dataset['json'] = JSON.stringify(leaderboardPartial, null, 4);

		// formatting and setting output
		const variablesLabels = variables.map(([variable, value]) => `\t${variable} - ${value}`).join('\n');
		text.textContent = `Game ID: ${game.id}\nCategory ID: ${activeTab.title}\nSubcategories:\n${variablesLabels}`;
	};

	// listen for potential updates
	document.querySelectorAll('.category.category-tab,.dropdown-item.category,.btn-group.custom-radio-group.variable,.dropdown.variable,.dropdown-menu')
		.forEach(el => el.addEventListener('click', () => updateData()))

	// set initial data
	updateData();

	return "Done!";
})().then(log);