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
	copyButton.style.bottom = '5px';
	copyButton.style.right = '5px';
	copyButton.style.color = 'var(--theme-legacy-button-dark)';
	copyButton.style.fontSize = '20px';
	copyButton.style.cursor = 'pointer';
	copyButton.addEventListener('click', () => navigator.clipboard.writeText(data.dataset.json));

	const updateData = async () => {
		// current active category tab element, or the current active category from misc.
		const activeTab = document.querySelector('.category-tab-name.active') ?? document.querySelector('.dropdown-item.category.active');
		const categoryId = activeTab.title;

		// all the SRC subcategories (API) under the current category
		const variableData = game.categories.data.find(cat => cat.id === categoryId).variables.data;
		const subcategoriesData = variableData.filter(vari => vari['is-subcategory']);

		// all the currently active subcategories (selected + visible)
		const subcatValues = Array.from(document.querySelectorAll('body.dark .custom-radio-group input[type="radio"]:checked + label,.dropdown.variable > label'))
			.filter(label => label.parentElement.style.display !== "none").map(choice => choice.textContent.trim());

		const subcategories = subcategoriesData.map((subcat, i) => {
			return {
				variable: subcat,
				valueLabel: subcatValues[i],
				valueId: Object.entries(subcat.values.values).find(([val, valObj]) => valObj.label === subcatValues[i])?.[0]
			}
		})

		// selected filters
		const filters = Array.from(document.querySelectorAll('.dropdown-submenu.var-filter'))
		.filter(li => li.style.display !== "none")	
		.map(vari => {
			const activeVar = vari.querySelector("a.dropdown-item.dropdown-toggle");
			const activeValue = vari.querySelector('ul > a.active');
			
			const variable = variableData.find(vari => vari.name === activeVar.textContent.trim());
			const valueLabel = activeValue.textContent.trim();
			
			return {
				variable, valueLabel,
				valueId: Object.entries(variable.values.values).find(([val, valObj]) => valObj.label === valueLabel)?.[0]
			}
		});

		const variables = [...subcategories, ...filters.filter(f => !!f.valueId)];

		const board = {
			game: game.id,
			category: categoryId,
			variables: Object.fromEntries(variables.map(({ variable, valueId }) => [variable.id, valueId] ))
		};
		data.dataset['json'] = JSON.stringify(board, null, 4);

		// formatting and setting output
		const variablesLabels = variables.map(({ variable, valueLabel, valueId }) => `\t${variable.name} [${variable.id}] - ${valueLabel} [${valueId}]`).join('\n');
		const content = `Game ID: ${board.game}\nCategory ID: ${board.category}\nVariables:\n${variablesLabels}\n\n `;
		text.textContent = content;

		await delay(100); // not jank. scientific. very scientific
		await waitForElm('#primary-leaderboard,#leaderboarddiv > div.center');
		const count = Array.from(document.querySelectorAll('#primary-leaderboard > tbody:nth-child(2) > tr')).map(tr => tr.dataset['target'].split("/").pop()).length;
		text.textContent = `${content}${count} runs in board.`;
	};

	// listen for potential updates
	document.querySelectorAll('.category.category-tab,.dropdown-item.category,.btn-group.custom-radio-group.variable,.dropdown.variable,.dropdown-menu')
		.forEach(el => el.addEventListener('click', () => updateData()))

	// set initial data
	updateData();

	return "Done!";
})().then(log);


// https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

// https://stackoverflow.com/questions/14226803/wait-5-seconds-before-executing-next-line
const delay = ms => new Promise(res => setTimeout(res, ms));