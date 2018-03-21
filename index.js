'use strict';

var searchTerm;

function handleSubmitButton() {
    $('#search-form').submit(function (e) {
        loadingShow();
        e.preventDefault();
        searchTerm = '';
        content = '';
        searchTerm = $('#text-area').val();
        $('#text-area').val('');
        parseRequest(searchTerm);
    });
}

function parseRequest(request) {
    checkIfShowMoreIsVisible();
    request = request.toLowerCase();
    if (request.includes('recipe')) {
        getRecipeData(request);
    } else if (request.includes('analyze')) {
        getNutritionData(request);
    } else {
        handleError();
        loadingHide();
    }
}

function removeInstructions() {
    $('#remove-instructions').on('click', function (e) {
        $('#instructions').remove();
    });
}

function loadingShow() {
    $('#submit-btn').text('Loading...').prop('disabled', true);
}

function loadingHide() {
    $('#submit-btn').text('Submit').prop('disabled', false);
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
            loadingHide();
            const foods = data.foods;
            if (foods.length === 0) {
                handleError();
            } else {
                calculateMacronutrients(foods);
                calculateMicronutrients(foods);
                calculateCalories(foods);
            }
        },
        error: function () {
            handleError();
            loadingHide();
        }
    });
}

function getRecipeData(searchTerm, recipeStart) {
    recipeStart = recipeStart || 12;
    $.ajax({
        url: 'https://api.edamam.com/search',
        type: 'get',
        data: {
            q: searchTerm,
            to: recipeStart,
            app_id: '54f6a76e',
            app_key: 'ed9fa62cc29a1ae5e51dff6c1f623e40'
        },
        success: function (data) {
            loadingHide();
            const results = data.hits;
            if (results.length === 0) {
                handleError();
            } else {
                renderRecipes(results);
            }
        },
        error: function () {
            handleError();
            loadingHide();
        }
    });
}

/*--------------------Error Functions---------------------*/


function handleError() {
    $('#error').toggle().html(`
      <div id="error-container">
         <p>Looks like there was an error.  Try checking your spelling or rewording your request and resubmitting. Make sure to include the keywords "analyze" or "recipes" in your request. If none of those work try again at a later time.<a href="#" id="empty-error">  [X]</a>
         </p>
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

function toggleShowMoreRecipes() {
    $('#show-more-recipes').toggle();
}

function checkIfShowMoreIsVisible() {
    if ($('#show-more-recipes').is(':visible')) {
        toggleShowMoreRecipes();
    };
}

function handleShowMoreRecipesButton() {
    var recipeStart = 12;
    $('#show-more-recipes').on('click', function (e) {
        e.preventDefault();
        recipeStart = recipeStart + 12;
        getRecipeData(searchTerm, recipeStart);
    });
}

function renderRecipes(results) {
    let recipes = results.map(result => {
        return {
            image: result.recipe.image,
            title: result.recipe.label,
            url: result.recipe.url
        };
    });
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

function loadingShowMore() {
    $('#show-more-recipes').text('Loading...').prop('disabled', true);
}

function loadingShowMoreHide() {
    $('#show-more-recipes').text('Show More').prop('disabled', false);
}


/*--------------------Nutrition Analysis Functions---------------------*/

const NUTRIENTS_ATTR_ID = [291, 301, 304, 307, 309, 320, 323, 401];
const NUTRIENTS_RDA = [25, 1000, 380, 2000, 10, 800, 15, 80];

function calculateCalories(foods) {
    const calories = Math.round(foods.map(food => food.nf_calories).reduce((a, b) => a + b));
    renderCalories(calories);
}

function calculateMicronutrients(foods) {
    var nutrientCount = {};
    foods.forEach(food => {
        NUTRIENTS_ATTR_ID.forEach(id => {
            var nutrient = food.full_nutrients.find(nutrient => {
                return nutrient.attr_id === id;
            });
            if (nutrient) {
                consolidateNutrientData(nutrient, nutrientCount);
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

function consolidateNutrientData(item, nutrientCount) {
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
    // To render new charts - need to remove the current ones and render new canvas

    $('canvas').remove();
    $('#results').html(` 
      <div id="calories-card">
        <div id="calories"></div>
      </div>
      <div id="micros-chart-card">
        <canvas id="micros" width="300" height="200"></canvas>
      </div>
      <div id="macros-chart-card">
       <canvas id="macros" width="300" height="200"></canvas>
      </div>
    `);
}

function makeMacrosChart(macronutrients) {
    renewCanvas();
    //Chart.js Config 
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
    //accessibility for charts
    $('#macros-chart-card > iframe').attr('title', 'macros-chart');
}

function makeMicrosChart(micronutrients) {
    var micros = $("#micros");
    //Chart.js Config
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
    //accessibility for charts
    $('#micros-chart-card > iframe').attr('title', 'micros-chart');
}

/*--------------------Speech Recognition Functions---------------------*/

function noSpeechRecogntion() {
    $('#speech-btn, #stop-speech-btn').hide();
    $('#instructions').text(`
      Want to know the nutrition of a meal? Ask me to analyze the ingredients. Don't know what to cook, why not ask me for recipes? For nutrition analysis type - "analyze" followed by the quantities and ingredients for each food, for example try "Analyze 1 cup of rice and 2 eggs". For recipes simply input the ingredient, cusine or specific dish with the keyword "recipes", for example try Sweet potato recipes".  Oh by the way if you open me up in Chrome you can speak your requests.
  `).append(`<a href="#" id="remove-instructions">Remove instructions</a>`);
}


//Check if speech recognition is available
if (!('webkitSpeechRecognition' in window)) {
    noSpeechRecogntion();
} else {
    //Speech recognition config
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    const textArea = $('#text-area');
    var content = '';

    recognition.onresult = function (event) {
        let current = event.resultIndex;
        let transcript = event.results[current][0].transcript;
        //Handle the repeat bug on mobile devices 
        let mobileBug = (current == 1 && transcript == event.results[0][0].transcript);
        if (!mobileBug) {
            content += transcript;
            textArea.val(content);
        }
    };
    $('#speech-btn').on('click', function (e) {
        if (content.length) {
            content += ' ';
        }
        recognition.start();
    });
    $('#stop-speech-btn').on('click', function () {
        recognition.stop();
    });
}

function start() {
    handleSubmitButton();
    removeInstructions();
}

$(start)
