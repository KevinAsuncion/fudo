//Calorie count back in 
//Toggle the show more-recipes button - have it load after the recipes have loaded
//Styling the show-more-recipes button - 
//Refactor macronutrient calculator 
//Make sure errors are taken care of 
//Style app - responsive, font, color, and images
//Commit to Git 
//Submit an MVP 
//Get feedback and submit in a Gist
//Fix accessibility - check axe 
//Documentation README
//Comment code to help

'use strict';
//Helper Functions 

var searchTerm; 

function handleSubmitButton() {
    $('#search-form').submit(function (e) {
        searchTerm = '';
        e.preventDefault();
        recognition.stop();
        searchTerm = $('#text-area').val();
        $('#text-area').val('');
        parseRequest(searchTerm);
    });
}

function parseRequest(request){
    request = request.toLowerCase();
    if(request.includes('recipe')){
        clearResults();
        recipeStart = 10;
        getRecipeData(request);
    } else if (request.includes('analyze')){
        obj = {};
        if ($("#show-more-recipes").is(":visible")) {
            toggleShowMoreRecipes();
        };
        clearResults();
        getNutritionData(request);
    } else {
        $('#results').text("I'm sorry I don't know how to do that. Try asking me to analyze or search for recipes.")
    }
}

function clearResults(){
    $("#results").empty();
}

function toggleShowMoreRecipes(){
    $("#show-more-recipes").toggle();
}

$('#show-more-recipes').on('click', function(e){
    e.preventDefault();
    recipeStart = recipeStart + 10; 
    getRecipeData(searchTerm)
})
//handle show more button function 

//API Calls 

//Analyze Nutrition 

function getNutritionData(searchTerm) {
    $.ajax({
        url: `https://trackapi.nutritionix.com/v2/natural/nutrients`,
        type: 'post',
        headers: {
            "x-app-id": "e4b7e33f",
            "x-app-key": "c95b8bbb3aa85b4f2f37ec0bab80dd4e",
        },
        data: {
            "query": searchTerm,
        },
        success: function (data) {
            console.log(data);
            const foods = data.foods
            // calculateCalories(foods);
            calculateMacronutrients(foods);
            calculateMicronutrients(foods);
           
        }
    })
}

//Recipes 

var recipeStart; 

function getRecipeData(searchTerm){
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
        console.log(data);
        const results = data.hits
        console.log(results)
        renderRecipes(results);
    });
}

// //Render Functions 

function renderRecipes(results){
    
    let recipes = results.map(result => {
        return {
            image: result.recipe.image,
            title: result.recipe.label,
            url: result.recipe.url 
        }
    })

    let recipeList = recipes.map(recipe => {
        return `
        <div class = "recipes col-4">
            <a href="${recipe.url}"><img src="${recipe.image}"></a>
            <p>${recipe.title}</p>
        </div>
        `})
    $('#results').html(recipeList)

    if (!$("#show-more-recipes").is(":visible")){
        toggleShowMoreRecipes();
    };
}

// //Nutrient Calculations 

// function calculateCalories(foods){
//     const calories = Math.round(foods.map(food => food.nf_calories).reduce((a,b) => a+b))
//     makeCaloriesChart(calories);
// }

const NUTRIENTS_ATTR_ID = [291, 301, 304, 307, 309, 320, 323, 401];
const NUTRIENTS_RDA = [25, 1000, 380, 2000, 10, 800, 15, 80];
var obj = {};

function calculateMicronutrients(foods){
    foods.forEach(food => {
        NUTRIENTS_ATTR_ID.forEach(id => {
            var nutrient = food.full_nutrients.find(nutrient => {
                return nutrient.attr_id === id;
            });
            if (nutrient) {
                consolidate(nutrient);
            }
        });
    })
    const nutrientTotals = Object.values(obj)
    console.log(nutrientTotals);
    const micronutrientPercents = nutrientTotals.map((nutrientTotal,index) => Math.round(nutrientTotal/NUTRIENTS_RDA[index] * 100))
    makeMicrosChart(micronutrientPercents);
}

function consolidate(item) {
    if (obj.hasOwnProperty(item.attr_id)) {
        obj[item.attr_id] += item.value;
    } else {
        obj[item.attr_id] = item.value;
    }
}

function calculateMacronutrients(foods){
    let macronutrients = [];
    macronutrients.push(Math.round(foods.map(food => food.nf_protein).reduce((a, b) => a + b)))
    macronutrients.push(Math.round(foods.map(food => food.nf_total_fat).reduce((a, b) => a + b)))
    macronutrients.push(Math.round(foods.map(food => food.nf_total_carbohydrate).reduce((a, b) => a + b)))
    makeMacrosChart(macronutrients);
}


//Speech Recognition

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

recognition.onstart = function () {
    console.log('Started Listening');
};

recognition.onspeechend = function () {
    console.log('Stopped listening');
};


$('#start-btn').on('click', function (e) {
    if (content.length) {
        content += ' ';
    }
    recognition.start();
    console.log('Started');
});

// //Chart Functions

function renewCanvas(){
    $('canvas').remove();
    $('#results').html(`
        <canvas id="micros" width="600" height="400"></canvas>
        <canvas id="macros" width="600" height="400"></canvas>
    `)
}

function makeMacrosChart(macronutrients){
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
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        }
    });
}

function makeMicrosChart(micronutrients){
    var micros = $("#micros");
    var microsChart = new Chart(micros, {
        type: 'bar',
        data: {
            labels: ['Fiber', 'Calcium', 'Magnesium', 'Sodium', 'Zinc', 'Vit A', 'Vit E', 'Vit C'],
            datasets: [{
                label: 'Percentage',
                data: micronutrients,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                ],
                borderColor: [
                    'rgba(255,99,132,1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        min: 0,
                        max: 100,
                        callback: function (value) { return value + "%" }
                    },
                    scaleLabel: {
                        display: true,
                        labelString: "Percentage"
                    }
                }]
            }
        }
    });
}



$(handleSubmitButton)



