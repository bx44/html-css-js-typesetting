pageCounter = 0;
pageLimit = 10;
startMasechet = "Berakhot";
startDaf = "2a";

pageWidth = 561;
pageHeight = 793;
pagePadding = 20;

commentarist = "Rashi";

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
    finished = 0;
    for(sectionCounter = 0; sectionCounter < data.he.length;){
        element = data.he[sectionCounter];

        var sectionRef = currentRef+'.'+sectionCounter;
        sectionRef = sectionRef.replace(' ', '_');
        var newEl = '<span ref="'+sectionRef+'">'+element.trim() + ' </span>';
        $('.page[page="'+pageCounter+'"] .mainText').append(newEl);
        
        if(isOverflowed()){
            $('.page[page="'+pageCounter+'"] .mainText span:last-child').remove();
            if(pageCounter < pageLimit){
                addPage();
                continue;
            } else {
                finished = 1;
                break;
            }
        }

        var commentary = data.commentary.filter(el => {
            return el.collectiveTitle.en == commentarist && el.anchorVerse == sectionCounter;
        });
        if (commentary.length > 0) {
            // console.log(commentary);
            newEl = '<div anchorRef="'+sectionRef+'"></div>';
            $('.page[page="'+pageCounter+'"] .commentary').append(newEl);
        }
        commentary.forEach(el => {
            var comment = el.he.split(/[–-]/, 2);
            console.log(comment);
            if (comment.length > 1) {
                newEl = '<span ref="'+el.ref+'"><span class="commentAnchor">' + comment[0].trim() + '. </span> ' + comment[1].trim() + ' </span>';
            } else {
                newEl = '<span ref="' + el.ref + '" class="noAnchor">' + comment[0].trim() + ' </span>';
            }
            $('div[anchorRef="'+sectionRef.split('.').join('\\.')+'"]').append(newEl);
        });

        if(isOverflowed()){
            var lastComment = $('.page[page="'+pageCounter+'"] .commentary div:last-of-type');
            var lastMain = $('.page[page="'+pageCounter+'"] .mainText span:last-of-type');
            lastComment.remove();
            lastMain.remove();
            if(pageCounter < pageLimit){
                addPage();
                continue;
            } else {
                finished = 0;
                break;
            }
        }

        adjustFloats();

        sectionCounter++;
    }

    if (finished == 1 || data.next == null) {
        centerEndofChapter();
        return;
    }
    var next = data.next.substring(0, data.next.lastIndexOf(' ')).replace(' ', '_')+'.'+data.next.substring(data.next.lastIndexOf(' ') + 1);
    currentRef = next;
        // console.log(currentRef);
    getData();
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

function adjustFloats(page=pageCounter) {


    mainText = $('.page[page="'+page+'"] .mainText');
    commentary = $('.page[page="'+page+'"] .commentary');

    if(mainText.outerHeight(true) > commentary.outerHeight(true)) {
        if(!mainText.hasClass('lessCommentary')) mainText.addClass('lessCommentary');
        if(!commentary.hasClass('lessCommentary')) commentary.addClass('lessCommentary');

        if($('.page[page="'+page+'"] .mainText')[0].nextSibling == $('.page[page="'+page+'"] .commentary')[0]) {
            mainText.detach();
            mainText.appendTo($('.page[page="'+page+'"]'));
        }
    }

    if(mainText.outerHeight(true) < commentary.outerHeight(true)) {
        if(mainText.hasClass('lessCommentary')) mainText.removeClass('lessCommentary');
        if(commentary.hasClass('lessCommentary')) commentary.removeClass('lessCommentary');
        
        if($('.page[page="'+page+'"] .commentary')[0].nextSibling == $('.page[page="'+page+'"] .mainText')[0]) {
            commentary.detach();
            commentary.appendTo($('.page[page="'+page+'"]'));
        }
    }    
}

function centerEndofChapter() {
    $('span:contains("הדרן")').addClass('endOfChapter');
}