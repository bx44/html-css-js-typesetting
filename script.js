pageCounter = 0;
pageLimit = 10;
startMasechet = "Bava_Batra";
startDaf = "2a";

pageWidth = 561;
pageHeight = 793;
pagePadding = 20;

currentRef = startMasechet+'.'+startDaf;
console.log(currentRef);

$.ajaxSetup({ cache: true});

$(document).ready(function(){
    addPage();
    getData();
});

function getData(){
    if(localStorage.getItem(currentRef) == null){
        $.getJSON(getUrl(currentRef)).done(function(data){
            try {
                localStorage.setItem(currentRef, JSON.stringify(data));
            } catch(domException) {
                if (domException.name === 'QuotaExceededError' || domException.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    localStorage.clear();
                    console.log('localStorage cleared.')
                    localStorage.setItem(currentRef, JSON.stringify(data));
                }
              }
            
            addData(data);
        });
    } else {
        addData(JSON.parse(localStorage.getItem(currentRef)));
    }
}

function addData(data){
    //console.log(data);
    // for commentary
    sectionCounter = 0;
    data.he.forEach(element => {
        var sectionRef = currentRef+'.'+sectionCounter;
        sectionRef = sectionRef.replace(' ', '_');
        var newEl = '<span ref="'+sectionRef+'">'+element.trim() + ' </span>';
        $('.page[page="'+pageCounter+'"] .mainText').append(newEl);
        if(isOverflowed()){
            $('.page[page="'+pageCounter+'"] .mainText span:last-child').remove();
            if(pageCounter < pageLimit){
                addPage();
                $('.page[page="'+pageCounter+'"] .mainText').append(newEl);
            } else {
                return;
            }
        }
        
        var commentary = data.commentary.filter(el => {
            return el.collectiveTitle.en == "Rashi" && el.anchorVerse == sectionCounter;
        });
        if (commentary.length > 0) {
            // console.log(commentary);
            newEl = '<div anchorRef="'+sectionRef+'"></div>';
            $('.page[page="'+pageCounter+'"] .commentary').append(newEl);
        }
        commentary.forEach(el => {
            var comment = el.he.split('-', 2);
            if (comment.length > 1) {
                newEl = '<span ref="'+el.ref+'"><span class="commentAnchor">' + comment[0].trim() + '. </span>' + comment[1].trim() + ' </span>';
            } else {
                newEl = '<span ref="' + el.ref + '" class="noAnchor">' + comment[0].trim() + '</span>';
            }
            $('div[anchorRef="'+sectionRef.split('.').join('\\.')+'"]').append(newEl);
        });
        if(isOverflowed()){
            var lastComment = $('.page[page="'+pageCounter+'"] .commentary div:last-of-type');
            var lastMain = $('.page[page="'+pageCounter+'"] .mainText span:last-of-type');
            lastComment.detach();
            lastMain.detach();
            if(pageCounter < pageLimit){
                addPage();
                lastMain.appendTo('.page[page="'+pageCounter+'"] .mainText');
                lastComment.appendTo('.page[page="'+pageCounter+'"] .commentary');
                if(isOverflowed()) {
                    // // $('.page[page="'+pageCounter+'"]').css('overflow', 'hidden');
                    $('.page[page="'+pageCounter+'"]').append('<div class="watermark">Overflowed</div>');
                }
            } else {
                return;
            }
        }
        sectionCounter++;
    });
    if (sectionCounter == data.he.length && !isOverflowed()) {
        var next = data.next.substring(0, data.next.lastIndexOf(' ')).replace(' ', '_')+'.'+data.next.substring(data.next.lastIndexOf(' ') + 1);
        currentRef = next;
        // console.log(currentRef);
        getData();
    }
}

function addPage(){
    pageCounter++;
    $('body').append('<div class="page" page="'+pageCounter+'"><div class="mainText"></div><div class="commentary"></div></div>');
    console.log('Added page '+pageCounter);
}

function getUrl(ref){
    return "https://www.sefaria.org/api/texts/"+ref+"/he/Wikisource_Talmud_Bavli?context=0&pad=0&commentary=1";
}

function isOverflowed(page=pageCounter){
    return $('.page[page="'+page+'"] .commentary').outerHeight(true) >= (pageHeight - (pagePadding * 2)) || $('.page[page="'+pageCounter+'"] .mainText').outerHeight(true) >= (pageHeight - (pagePadding * 2));
}