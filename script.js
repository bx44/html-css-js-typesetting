pageCounter = 0;
pageLimit = 7;
startMasechet = "Bava_Kamma";
startDaf = "15b";

pageWidth = 561;
pageHeight = 793;
pagePadding = 20;

commentarist = "Rashi";

currentRef = startMasechet+'.'+startDaf;
console.log(currentRef);

$.ajaxSetup({ cache: true});

$(document).ready(function(){
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
    recoveredMain = '';
    recoveredCommentary = '';
    if (pageCounter == 0) {
        addPage(data);
    }
    for(sectionCounter = 0; sectionCounter < data.he.length;){
        if(recoveredMain != '') {
            $('.page[page="'+pageCounter+'"] .mainText').append(recoveredMain);
            recoveredMain = '';
        }
        if(recoveredCommentary != '') {
            $('.page[page="'+pageCounter+'"] .commentary').append(recoveredCommentary);
            recoveredCommentary = '';
        }
        element = data.he[sectionCounter];

        var sectionRef = currentRef+'.'+sectionCounter;
        sectionRef = sectionRef.replace(' ', '_');
        var newMain = $('<span ref="'+sectionRef+'">'+element.trim() + ' </span>');
        $('.page[page="'+pageCounter+'"] .mainText').append(newMain);

        var commentary = data.commentary.filter(el => {
            return el.collectiveTitle.en == commentarist && el.anchorVerse == sectionCounter;
        });
        var newContainer;
        if (commentary.length > 0) {
            // console.log(commentary);
            newContainer = $('<div anchorRef="'+sectionRef+'"></div>');
            $('.page[page="'+pageCounter+'"] .commentary').append(newContainer);
        }
        commentary.forEach(el => {
            var comment = el.he.split(/[–\.-](.+)/, 2);
            if (comment.length > 1) {
                newEl = '<span ref="'+el.ref+'"><span class="commentAnchor">' + comment[0].trim() + '. </span> ' + comment[1].trim() + ' </span>';
            } else {
                newEl = '<span ref="' + el.ref + '" class="noAnchor">' + comment[0].trim() + ' </span>';
            }
            $('div[anchorRef="'+sectionRef.split('.').join('\\.')+'"]').append(newEl);
        });

        adjustFloats();
        centerEndofChapter();
        
        if(isOverflowed()){
            newMain.detach();
            try {
                newContainer.detach();
            } catch(e) {
            }                
            adjustFloats();
            if(itsTooEmpty()){
                pageBeingFixed = pageCounter;
                
                newMain.appendTo($('.page[page="'+pageCounter+'"] .mainText'));
                // Should check for possible overflow but low propability of it happening
                
                //Fixing commentary overflow
                newContainer.children().each(function() {
                    el = $(this);
                    el.html(el.text());
                    finalText = '';
                    splitted = el.text().split(' ');
                    for(i = 0; i < splitted.length; i++) {
                        finalText += '<span class="tempSpan" index="'+i+'">'+splitted[i]+' </span>';
                    }
                    el.html(finalText);
                });
                newContainer.appendTo($('.page[page="'+pageCounter+'"] .commentary'));
                overflowed = $('.page[page="'+pageCounter+'"] .commentary .tempSpan').filter((id, element) => {
                    return $(element)[0].offsetTop + $(element).height() > (pageHeight - (pagePadding * 2));
                });
                for(x=1; i < overflowed.length; i++){
                    // console.log(overflowed[x]);
                }
                if(overflowed.length > 0){
                    savedText = $(overflowed[0]).text() + $(overflowed[0]).nextAll().text();
                    ref = $(overflowed[0]).parent().attr('ref');
                    recoveredCommentary = '<span ref="'+ref+'">'+savedText+'</span>';
                    anchorRef = $(overflowed[0]).parent().parent().attr('anchorRef');
                    $(overflowed[0]).parent().nextAll().each(function() {
                        savedText = $(this).text();
                        ref = $(this).attr('ref');
                        recoveredCommentary += '<span ref="'+ref+'">'+savedText+'</span>';
                    });
                    $('.page[page="'+pageCounter+'"] .commentary').addClass('continues');
                    $(overflowed[0]).nextAll().remove();
                    $(overflowed[0]).parent().nextAll().remove();
                    $(overflowed[0]).remove();
                    recoveredCommentary = '<div anchorRef="'+anchorRef+'" class="isContinuation">'+recoveredCommentary+'</div>';
                }

                //Fixing mainText overflow
                finalText = '';
                newMain.html().split(' ').forEach((element) => {
                    finalText += '<span class="tempSpan">'+element+' </span>';
                });
                newMain.html(finalText);
                ref = newMain.attr('ref');

                overflowed = $('.page[page="'+pageBeingFixed+'"] .mainText .tempSpan').filter((id, element) => {
                    return $(element)[0].offsetTop + $(element).height() > (pageHeight - (pagePadding * 2));
                });
                if (overflowed.length > 0) {
                    recoveredMain = $(overflowed[0]).text() + $(overflowed[0]).nextAll().text();
                    recoveredMain = '<span ref="'+ref+'" class="isContinuation">'+recoveredMain+'</span>';
                    $('.page[page="'+pageCounter+'"] .mainText').addClass('continues');
                    $(overflowed[0]).nextAll().remove();
                    $(overflowed[0]).remove();
                }
                
                sectionCounter++;
            }
            if(pageCounter < pageLimit){
                addPage(data);
                continue;
            } else {
                if (pageCounter == pageLimit) {
                    finished = 1;
                } else {
                    finished = 0;
                }
                break;
            }
        }

        sectionCounter++;
    }

    if (finished == 1 || data.next == null) {
        return;
    }
    var next = data.next.substring(0, data.next.lastIndexOf(' ')).replace(' ', '_')+'.'+data.next.substring(data.next.lastIndexOf(' ') + 1);
    currentRef = next;
        // console.log(currentRef);
    getData();
}

function addPage(data){
    if (isOverflowed()) addWarning('Unusual Overflow');
    pageCounter++;
    $('body').append('<div class="page" page="'+pageCounter+'"><div class="warning"><ul></ul></div>'+header(data)+'<div class="mainText"></div><div class="commentary"></div></div>');
    console.log('Added page '+pageCounter);
}

function header(data) {
    return '<div class="header">'+data.heIndexTitle+'</div>';

}

function getUrl(ref){
    return "https://www.sefaria.org/api/texts/"+ref+"/he/Wikisource_Talmud_Bavli?context=0&pad=0&commentary=1";
}

function isOverflowed(page=pageCounter){
    if(pageCounter==0) return false;
    return $('.page[page="'+page+'"] .commentary')[0].offsetTop + $('.page[page="'+page+'"] .commentary').outerHeight(true) >= (pageHeight - pagePadding ) || $('.page[page="'+page+'"] .mainText')[0].offsetTop + $('.page[page="'+pageCounter+'"] .mainText').outerHeight(true) >= (pageHeight - pagePadding);
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
    try {
        $('span[ref]:contains("הדרן")').addClass('endOfChapter');
        $('span[ref]:contains("הדרן")').height(pageHeight - $('span[ref]:contains("הדרן")')[0].offsetTop);
    } catch {
        
    }
    
}

function addWarning(warning, page=pageCounter) {
    $('.page[page="'+page+'"] .warning ul').append('<li>'+warning+'</li>');
    console.warn(warning+' On page '+page+'.');
}

function itsTooEmpty(page=pageCounter) {
    var percent = $('.page[page="'+page+'"] > *:last-child')[0].offsetTop + $('.page[page="'+page+'"] > *:last-child').height()* (100 / $('.page[page="'+page+'"]').height());
    // console.log(percent);
    // console.log(biggerNumber($('.page[page="'+page+'"] .mainText').outerHeight(true), $('.page[page="'+page+'"] .commentary').outerHeight(true)));
    // console.log($('.page[page="'+page+'"]').height());
    if (percent < 90) return true;
    return false;
}

function biggerNumber(a, b){
    if (a > b) return a;
    return b;
}