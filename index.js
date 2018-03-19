'use strict';

var searchTerm;

function handleSubmitButton() {
    $('#search-form').submit(function (e) {
        searchTerm = '';
        content = '';
        e.preventDefault();
        searchTerm = $('#text-area').val();
        $('#text-area').val('');
        parseRequest(searchTerm);
    });
}

function parseRequest(request) {
    request = request.toLowerCase();
    if (request.includes('recipe')) {
        if ($('#show-more-recipes').is(':visible')) {
            toggleShowMoreRecipes();
        };
        clearResults();
        recipeStart = 12;
        getRecipeData(request);
    } else if (request.includes('analyze')) {
        nutrientCount = {};
        if ($('#show-more-recipes').is(':visible')) {
            toggleShowMoreRecipes();
        };
        clearResults();
        getNutritionData(request);
    } else {
        if ($('#show-more-recipes').is(':visible')) {
            toggleShowMoreRecipes();
        };
        apiError();
    }
}

function removeInstructions() {
    $('#remove-instructions').on('click', function (e) {
        $('#instructions').remove();
    });
}

function clearResults() {
    $('#results').empty();
}

/*--------------------API Calls---------------------*/

function getNutritionData(searchTerm) {
    $.ajax({
        url: 'https://trackapi.nutritionix.com/v2/natural/nutrients',
        type: 'post',
        headers: {
            'x-app-id': 'e4b7e33f',
            'x-app-key': 'c95b8bbb3aa85b4f2f37ec0bab80dd4e',
        },
        data: {
            'query': searchTerm,
        },
        success: function (data) {
            const foods = data.foods;

            if (foods.length === 0) {
                noResultsError();
            } else {
                calculateMacronutrients(foods);
                calculateMicronutrients(foods);
                calculateCalories(foods);
            }
        },
        error: function () {
            apiError();
        }
    });
}


function getRecipeData(searchTerm) {
    let url = 'https://api.edamam.com/search';
    let id = '54f6a76e';
    let key = 'ed9fa62cc29a1ae5e51dff6c1f623e40';
    let query = {
        q: searchTerm,
        to: recipeStart,
        app_id: id,
        app_key: key
    };
    $.getJSON(url, query, function (data) {
        const results = data.hits;
        if (results.length === 0) {
            noResultsError();
        } else {
            renderRecipes(results);
        }
    });
}

/*--------------------Error Functions---------------------*/

function noResultsError() {
    $('#error').toggle().html(`
    <div id="error-container">
    <p>No results. Try checking your spelling or rewording your request and resubmitting.  If that doesn't work try a different request.<a href="#" id="empty-error"> [X]</a></p>
    </div>
    `);
    emptyError();
}

function apiError() {
    $('#error').toggle().html(`
    <div id="error-container">
    <p>No results. Try checking your spelling or rewording your request and resubmitting. If that doesn't work try a different request.<a href="#" id="empty-error"> [X]</a></p>
    </div>
    `);
    emptyError();
}

function emptyError() {
    $('#empty-error').on('click', function (e) {
        $('#error').empty().toggle();
    });
}

/*--------------------Recipe Functions---------------------*/

var recipeStart;

function toggleShowMoreRecipes() {
    $('#show-more-recipes').toggle();
}

function handleShowMoreRecipesButton() {
    $('#show-more-recipes').on('click', function (e) {
        e.preventDefault();
        recipeStart = recipeStart + 12;
        getRecipeData(searchTerm);
    });
}

function renderRecipes(results) {
    let recipes = results.map(result => {
        return {
            image: result.recipe.image,
            title: result.recipe.label,
            url: result.recipe.url
        }
    })
    let recipeList = recipes.map(recipe => {
        return `
        <div class ="recipe-card">
            <a target="_blank" href="${recipe.url}"><img class="recipe-card-image"src="${recipe.image}" alt="${searchTerm}-${recipe.title}">
            <p class="recipe-card-title">${recipe.title}</p></a>
        </div>
        `});
    $('#results').html(recipeList)
    if (!$("#show-more-recipes").is(":visible")) {
        toggleShowMoreRecipes();
        handleShowMoreRecipesButton();
    };
}


/*--------------------Nutrition Analysis Functions---------------------*/

const NUTRIENTS_ATTR_ID = [291, 301, 304, 307, 309, 320, 323, 401];
const NUTRIENTS_RDA = [25, 1000, 380, 2000, 10, 800, 15, 80];
var nutrientCount = {};

function calculateCalories(foods) {
    const calories = Math.round(foods.map(food => food.nf_calories).reduce((a, b) => a + b));
    renderCalories(calories);
}

function calculateMicronutrients(foods) {
    foods.forEach(food => {
        NUTRIENTS_ATTR_ID.forEach(id => {
            var nutrient = food.full_nutrients.find(nutrient => {
                return nutrient.attr_id === id;
            });
            if (nutrient) {
                consolidateNutrientData(nutrient);
            }
        });
    });
    const nutrientTotals = Object.values(nutrientCount);
    const micronutrientPercents = nutrientTotals.map((nutrientTotal, index) => Math.round(nutrientTotal / NUTRIENTS_RDA[index] * 100));
    makeMicrosChart(micronutrientPercents);
}

function calculateMacronutrients(foods) {
    let macronutrients = [];
    macronutrients.push(Math.round(foods.map(food => food.nf_protein).reduce((a, b) => a + b)));
    macronutrients.push(Math.round(foods.map(food => food.nf_total_fat).reduce((a, b) => a + b)));
    macronutrients.push(Math.round(foods.map(food => food.nf_total_carbohydrate).reduce((a, b) => a + b)));
    makeMacrosChart(macronutrients);
}

function consolidateNutrientData(item) {
    if (nutrientCount.hasOwnProperty(item.attr_id)) {
        nutrientCount[item.attr_id] += item.value;
    } else {
        nutrientCount[item.attr_id] = item.value;
    }
}

function renderCalories(calories) {
    $("#calories").text(`${calories} calories`)
}

/*--------------------Nutrition Chart Functions---------------------*/

function renewCanvas() {
    $('canvas').remove();
    $('#results').html(` 
      <div id="micros-chart-card">
        <canvas id="micros" width="300" height="200"></canvas>
      </div>
      <div id="macros-chart-card">
       <canvas id="macros" width="300" height="200"></canvas>
      </div>
    `);
    $('#results').prepend(`
        <div id="calories-card"><div id="calories"></div></div>
    `);
}

function makeMacrosChart(macronutrients) {
    renewCanvas();
    var macros = $("#macros");
    var macrosChart = new Chart(macros, {
        type: 'doughnut',
        data: {
            labels: ["Protein", "Fat", "Carbohydrate"],
            datasets: [
                {
                    backgroundColor: ["#3e95cd", "#8e5ea2", "#3cba9f"],
                    data: macronutrients
                }
            ]
        },
        options: {
            title: {
                display: true,
                text: 'Macronutrients(in grams)',
                fontSize: 16
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        }
    });
}

function makeMicrosChart(micronutrients) {
    var micros = $("#micros");
    var microsChart = new Chart(micros, {
        type: 'bar',
        data: {
            labels: ['Fiber', 'Calcium', 'Magnesium', 'Sodium', 'Zinc', 'Vit A', 'Vit E', 'Vit C'],
            datasets: [{
                label: 'Percent of RDA',
                data: micronutrients,
                backgroundColor: [
                    '#FF6384',
                    '#8087ee',
                    '#4bb3f2',
                    '#6cd67e',
                    '#e7e265',
                    '#ec9255',
                    '#425cdb',
                    '#ea4343',
                    '#45cebc',
                    '#e144d2',
                ]
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: 100,
                        callback: function (value) { return value + "%" }
                    }
                }]
            },
            title: {
                display: true,
                text: 'Micronutrients(% of RDA)',
                fontSize: 16
            }
        }
    });
}

/*--------------------Speech Recognition Functions---------------------*/

function noSpeechRecogntion() {
    $('#speech-btn').hide();
    $('#stop-speech-btn').hide();
    $('#instructions').html(`
  <p id="instructions">Want to know the nutrition of a meal? Ask me to analyze the ingredients. Don't know what to cook, why not ask me for recipes? For nutrition analysis type "Analyze 1 cup of rice and 2 eggs" -always include the "analyze" keyword followed by the quantity and ingredient. For recipes simply input the ingredient with the keyword "recipes" for example try Sweet potato recipes".  Oh by the way if you open me up in the Chrome you can speak your requests. <a href="#" id="remove-instructions">Remove instructions</a></p> 
  `);
}

function handleStopSpeechButton() {
    $('#stop-speech-btn').on('click', function () {
        recognition.stop();
    });
}

if (!('webkitSpeechRecognition' in window)) {
    noSpeechRecogntion();
} else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;

    const textArea = $('#text-area');
    var content = '';

    recognition.onresult = function (event) {
        var current = event.resultIndex;
        var transcript = event.results[current][0].transcript;
        content += transcript;
        textArea.val(content);
    };
    $('#speech-btn').on('click', function (e) {
        if (content.length) {
            content += ' ';
        }
        recognition.start();
    });
}

function start() {
    handleSubmitButton();
    removeInstructions();
}

$(start)
