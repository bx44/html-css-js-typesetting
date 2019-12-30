pageCounter = 0;
startMasechet = "Bava_Metzia";
startDaf = "2a";

pageWidth = 561;
pageHeight = 793;
pagePadding = 20;

currentRef = startMasechet+'.'+startDaf;

$.ajaxSetup({ cache: true});

$(document).ready(function(){
    addPage();
    getData();
});

function getData(){
    if(localStorage.getItem(currentRef) == null){
        $.getJSON(getUrl(currentRef)).done(function(data){
            localStorage.setItem(currentRef, JSON.stringify(data));
            addData(data);
        });
    } else {
        addData(JSON.parse(localStorage.getItem(currentRef)));
    }
}

function addData(data){
    console.log(data);
    // for commentary
    sectionCounter = 0;
    data.he.forEach(element => {
        $('.page[page="'+pageCounter+'"] .mainText').append('<span ref="'+currentRef+'.'+sectionCounter+'">'+element.trim() + ' </span>');
        if(pageIsFull()){
            $('.page[page="'+pageCounter+'"] .mainText span:last-child').remove();
            if(pageCounter < 4){
                addPage();
                $('.page[page="'+pageCounter+'"] .mainText').append('<span ref="'+currentRef+'.'+sectionCounter+'">'+element.trim() + ' </span>');
            } else {
                return;
            }
        }
        sectionCounter++;
    });
    if (sectionCounter == data.he.length && !pageIsFull()) {
        currentRef = data.next;
        getData();
    }
}

function addPage(){
    pageCounter++;
    $('body').append('<div class="page" page="'+pageCounter+'"><div class="mainText"></div><div class="commentary"></div></div>');
    console.log('Added page '+pageCounter);
}

function getUrl(ref){
    return "https://www.sefaria.org/api/texts/"+ref+"/he/Wikisource_Talmud_Bavli?context=0&pad=0&commentary=0";
}

function pageIsFull(){
    console.log($('.page[page="'+pageCounter+'"] .mainText').outerHeight(true));
    if($('.page[page="'+pageCounter+'"] .mainText').outerHeight(true) >= (pageHeight - (pagePadding * 2))) {
        console.log('pageFull');
        return true;
    } else {
        return false;
    }
}