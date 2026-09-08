'use strict';

/*
 * Composicion de paginas de Talmud en HTML/CSS/JS.
 * Autor original: Barak z"l
 *
 * Maqueta de tres columnas: Guemara al centro, Rashi de un lado y Tosafot del
 * otro. Cada comentario ocupa su mitad de la caja; dentro de esa mitad hay una
 * "muesca" invisible pegada al centro, de la altura de la Guemara, alrededor
 * de la cual fluye el texto y forma la L.
 */

// ---------------------------------------------------------------------------
// Configuracion
// ---------------------------------------------------------------------------

var pageCounter = 0;
var pageLimit = 15;
var startMasechet = 'Bava_Batra';
var startDaf = '2a';

var pageHeight = 793;
var pageVerticalPadding = 20;

// Fraccion del alto util que puede ocupar el bloque de Guemara antes de
// cortarse. Sube este numero para paginas con mas Guemara y menos comentario.
var mainMaxRatio = 0.55;

// Las dos columnas de comentario. Para agregar otra (Rabenu Gershom, Rashbam)
// basta con sumar una entrada aqui, un <div> en addPage y una regla en el CSS.
var SIDES = [
    { key: 'commentary', commentarist: 'Rashi' },
    { key: 'tosafot', commentarist: 'Tosafot' }
];

var currentRef = startMasechet + '.' + startDaf;

// Fragmentos pendientes de la pagina anterior
var recovered = { mainText: null, commentary: null, tosafot: null, reference: null };

var sectionCounter = 0;
var finished = 0;
var isRunning = false;

$.ajaxSetup({ cache: true });

$(document).ready(function () {
    // Las fuentes deben estar cargadas ANTES de medir alturas.
    WebFont.load({
        custom: { families: ['Vilna', 'Rashi'] },
        active: enableStart,
        inactive: enableStart
    });
    $('#start').on('click', start);
});

function enableStart() {
    $('#start').prop('disabled', false);
    setStatus('Listo.');
}

function setStatus(text) {
    $('#status').text(text);
}

function start() {
    if (isRunning) return;
    isRunning = true;
    $('#start').prop('disabled', true);
    setStatus('Cargando ' + currentRef + '…');
    getData();
}

function finish(message) {
    isRunning = false;
    $('#start').prop('disabled', false);
    setStatus(message || ('Terminado: ' + pageCounter + ' paginas.'));
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

function getUrl(ref) {
    return 'https://www.sefaria.org/api/texts/' + ref +
        '/he/Wikisource_Talmud_Bavli?context=0&pad=0&commentary=1';
}

function getData() {
    var cached = localStorage.getItem(currentRef);

    if (cached !== null) {
        try {
            addData(JSON.parse(cached));
        } catch (e) {
            localStorage.removeItem(currentRef);
            fetchData();
        }
        return;
    }

    fetchData();
}

function fetchData() {
    var ref = currentRef;
    setStatus('Descargando ' + ref + '…');

    $.getJSON(getUrl(ref))
        .done(function (data) {
            cacheData(ref, data);
            addData(data);
        })
        .fail(function (jqXHR, textStatus) {
            var detail = jqXHR.status ? ('HTTP ' + jqXHR.status) : textStatus;
            console.error('Fallo la peticion de ' + ref + ': ' + detail);
            addWarning('Sin datos: ' + ref);
            finish('Error al descargar ' + ref + ' (' + detail + ').');
        });
}

function cacheData(ref, data) {
    try {
        localStorage.setItem(ref, JSON.stringify(data));
    } catch (e) {
        console.warn('No se pudo guardar ' + ref + ' en cache (' + e.name + ').');
    }
}

// ---------------------------------------------------------------------------
// Acceso a la pagina actual
// ---------------------------------------------------------------------------

function page(n) {
    n = n || pageCounter;
    var $p = $('.page[page="' + n + '"]');
    return {
        el: $p,
        body: $p.find('.body'),
        mainText: $p.find('.mainText'),
        commentary: $p.find('.commentary'),
        tosafot: $p.find('.tosafot'),
        reference: $p.find('.reference'),
        notches: $p.find('.notch')
    };
}

// ---------------------------------------------------------------------------
// Construccion de la pagina
// ---------------------------------------------------------------------------

function addData(data) {
    if (!data || !data.he || !data.he.length) {
        finish('La respuesta de Sefaria no trae texto para ' + currentRef + '.');
        return;
    }

    var commentaryList = data.commentary || [];

    sectionCounter = 0;
    finished = 0;

    if (pageCounter === 0) addPage(data);

    for (sectionCounter = 0; sectionCounter < data.he.length; sectionCounter++) {
        var p = page();

        if (emptyPage()) {
            ['mainText', 'commentary', 'tosafot', 'reference'].forEach(function (key) {
                if (recovered[key]) {
                    p[key].append(recovered[key]);
                    recovered[key] = null;
                }
            });
        }

        var element = data.he[sectionCounter];
        if (typeof element !== 'string') element = String(element);

        var sectionRef = (currentRef + '.' + sectionCounter).replace(/ /g, '_');

        // --- Guemara -------------------------------------------------------
        var newMain = $('<span ref="' + sectionRef + '">' + element.trim() + ' </span>');
        p.mainText.append(newMain);

        // --- comentarios ---------------------------------------------------
        var fresh = {};
        SIDES.forEach(function (side) {
            var list = commentaryList.filter(function (el) {
                return el && el.collectiveTitle && el.collectiveTitle.en === side.commentarist &&
                    el.anchorVerse === sectionCounter;
            });

            if (list.length === 0) {
                fresh[side.key] = null;
                return;
            }

            var $block = $('<div class="comment" anchorRef="' + sectionRef + '"></div>');
            p[side.key].append($block);

            list.forEach(function (el) {
                var comment = el.he.split(/[–\.-](.+)/, 2);
                if (comment.length > 1) {
                    $block.append('<span ref="' + el.ref + '"><span class="commentAnchor">' +
                        comment[0].trim() + '. </span> ' + comment[1].trim() + ' </span>');
                } else {
                    $block.append('<span ref="' + el.ref + '" class="noAnchor">' +
                        comment[0].trim() + ' </span>');
                }
            });

            fresh[side.key] = $block;
        });

        // --- referencias ---------------------------------------------------
        var validType = ['mishna in talmud', 'mesorat hashas'];
        var validCat = ['Mishna', 'Tanakh'];
        var references = commentaryList.filter(function (el) {
            return el && el.anchorVerse === sectionCounter &&
                (validType.indexOf(el.type) !== -1 || validCat.indexOf(el.category) !== -1);
        });

        var newReferences = null;
        if (references.length > 0) {
            newReferences = $('<div class="comment" anchorRef="' + sectionRef + '"></div>');
            p.reference.append(newReferences);
            references.forEach(function (el) {
                newReferences.append('<span ref="' + el.ref + '">' +
                    el.sourceHeRef.replace(/׳|״/g, '') + '; </span>');
            });
        }

        syncNotches(p);
        numberRefs();
        centerEndofChapter();

        // --- corte -----------------------------------------------------------
        if (mainOverflowed(p) || isOverflowed()) {
            // 1) La Guemara primero. Su altura define la geometria de las
            //    muescas, asi que los comentarios tienen que cortarse DESPUES,
            //    contra la forma definitiva de la pagina.
            recovered.mainText = fragment(
                newMain,
                $('<span ref="' + newMain.attr('ref') + '" class="isContinuation"></span>'),
                function () { return mainOverflowed(p); },
                function () { syncNotches(p); }
            );
            if (recovered.mainText) p.mainText.addClass('continues');

            syncNotches(p);

            // 2) Ahora si, cada comentario contra la geometria ya final.
            SIDES.forEach(function (side) {
                if (!fresh[side.key]) return;
                recovered[side.key] = fragment(
                    fresh[side.key],
                    $('<div class="comment isContinuation" anchorRef="' +
                        fresh[side.key].attr('anchorref') + '"></div>'),
                    isOverflowed,
                    null
                );
                if (recovered[side.key]) p[side.key].addClass('continues');
            });

            // Si no cupo ni una palabra de Guemara, la seccion entera pasa a la
            // pagina siguiente y esta no lleva su referencia.
            if (newMain.text().trim() === '') {
                newMain.remove();
                p.mainText.removeClass('continues');
                SIDES.forEach(function (side) { p[side.key].removeClass('continues'); });
                if (newReferences) {
                    newReferences.detach();
                    recovered.reference = newReferences;
                }
            }

            syncNotches(p);

            if (pageCounter < pageLimit) {
                addPage(data);
            } else {
                finished = (pageCounter === pageLimit) ? 1 : 0;
                break;
            }
        }
    }

    if (finished === 1 || data.next == null) {
        finish();
        return;
    }

    var cut = data.next.lastIndexOf(' ');
    currentRef = data.next.substring(0, cut).replace(/ /g, '_') +
        '.' + data.next.substring(cut + 1);

    setStatus('Pagina ' + pageCounter + ' — siguiendo en ' + currentRef + '…');
    getData();
}

function addPage(data) {
    if (isOverflowed()) addWarning('Unusual Overflow');
    if (pageCounter > 0 && itsTooEmpty()) addWarning('Too empty.');

    pageCounter++;

    $('body').append(
        '<div class="page" page="' + pageCounter + '">' +
        '<div class="warning"><ul></ul></div>' +
        '<div class="header">' + data.heIndexTitle + '</div>' +
        '<div class="body">' +
        '<div class="side commentary"><div class="notch"></div></div>' +
        '<div class="side tosafot"><div class="notch"></div></div>' +
        '<div class="mainText"></div>' +
        '</div>' +
        '<div class="reference"></div>' +
        '</div>'
    );
}

/*
 * Iguala la altura de las muescas a la de la Guemara, redondeada hacia arriba a
 * un multiplo de la altura de linea del comentario para que la L caiga alineada
 * al renglon. Tambien fija el alto minimo del cuerpo, porque la Guemara esta en
 * posicion absoluta y no aporta altura por si sola.
 */
function syncNotches(p) {
    p = p || page();

    var mainHeight = p.mainText.outerHeight(true) || 0;
    var lineHeight = parseFloat(p.commentary.css('line-height')) || 16;
    var notchHeight = Math.ceil(mainHeight / lineHeight) * lineHeight;

    p.notches.height(notchHeight);
    p.body.css('min-height', mainHeight + 'px');
}

// ---------------------------------------------------------------------------
// Fragmentacion entre paginas
// ---------------------------------------------------------------------------

/*
 * Corta $source en el ultimo punto donde todavia cabe y mueve el resto a
 * $continuation. Conserva el marcado interno (negritas del dibur ha-matjil) en
 * ambos lados del corte y localiza el punto por busqueda binaria.
 *
 * test()   devuelve true si la pagina se desborda.
 * reflow() se llama despues de cada cambio de visibilidad, cuando la geometria
 *          depende de lo que estamos midiendo (caso de la Guemara).
 *
 * Devuelve $continuation si hubo corte, o null si todo cupo.
 */
function fragment($source, $continuation, test, reflow) {
    var root = $source[0];
    var spans = wrapWords(root);

    if (spans.length === 0) {
        unwrapWords(root);
        return null;
    }

    var lastFitting = findLastFitting(spans, test, reflow);

    showThrough(spans, spans.length - 1);
    if (reflow) reflow();

    if (lastFitting === spans.length - 1) {
        unwrapWords(root);
        return null;
    }

    var tail = splitAfter(root, lastFitting >= 0 ? spans[lastFitting] : null);
    $continuation[0].appendChild(tail);

    unwrapWords(root);
    unwrapWords($continuation[0]);
    if (reflow) reflow();

    return $continuation;
}

// Envuelve cada palabra en <span class="tempSpan"> recorriendo NODOS DE TEXTO,
// sin tocar los elementos: asi el marcado sobrevive a la fragmentacion.
function wrapWords(root) {
    var spans = [];

    (function walk(node) {
        var children = Array.prototype.slice.call(node.childNodes);
        children.forEach(function (child) {
            if (child.nodeType === 3) {
                var parts = child.nodeValue.split(/(\s+)/);
                var frag = document.createDocumentFragment();
                var added = false;

                parts.forEach(function (part) {
                    if (part === '') return;
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                        return;
                    }
                    var span = document.createElement('span');
                    span.className = 'tempSpan';
                    span.textContent = part;
                    frag.appendChild(span);
                    spans.push(span);
                    added = true;
                });

                if (added) node.replaceChild(frag, child);
            } else if (child.nodeType === 1) {
                walk(child);
            }
        });
    })(root);

    return spans;
}

function unwrapWords(root) {
    var spans = root.querySelectorAll ? root.querySelectorAll('span.tempSpan') : [];
    Array.prototype.slice.call(spans).forEach(function (span) {
        span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    });
    if (root.normalize) root.normalize();
}

function showThrough(spans, lastVisible) {
    for (var i = 0; i < spans.length; i++) {
        spans[i].style.display = (i <= lastVisible) ? '' : 'none';
    }
}

function findLastFitting(spans, test, reflow) {
    showThrough(spans, spans.length - 1);
    if (reflow) reflow();
    if (!test()) return spans.length - 1;

    var lo = -1;
    var hi = spans.length - 1;

    while (lo < hi) {
        var mid = Math.floor((lo + hi + 1) / 2);
        showThrough(spans, mid);
        if (reflow) reflow();
        if (test()) { hi = mid - 1; } else { lo = mid; }
    }

    // Verificacion lineal, por si la geometria no es estrictamente monotona.
    while (lo >= 0) {
        showThrough(spans, lo);
        if (reflow) reflow();
        if (!test()) break;
        lo--;
    }

    return lo;
}

function splitAfter(root, span) {
    var range = document.createRange();
    if (span) { range.setStartAfter(span); } else { range.setStart(root, 0); }
    range.setEnd(root, root.childNodes.length);
    return range.extractContents();
}

// ---------------------------------------------------------------------------
// Medicion
// ---------------------------------------------------------------------------

// La Guemara excede su propia caja (no toda la pagina).
function mainOverflowed(p) {
    p = p || page();
    return p.mainText.outerHeight(true) >
        (pageHeight - 2 * pageVerticalPadding) * mainMaxRatio;
}

// Alguna columna empuja el bloque de referencias fuera de la pagina.
function isOverflowed(n) {
    if (pageCounter === 0) return false;

    var p = page(n);
    if (p.reference.length === 0) return false;

    return p.reference.position().top + p.reference.outerHeight(true) >
        (pageHeight - pageVerticalPadding);
}

function centerEndofChapter(n) {
    var p = page(n);
    p.mainText.find('span[ref]:contains("הדרן")').each(function () {
        var $el = $(this);
        $el.addClass('endOfChapter');
        $el.height(pageHeight - this.offsetTop);
    });
}

function numberRefs(n) {
    var p = page(n);

    p.reference.css('visibility', p.reference.text() === '' ? 'hidden' : 'visible');
    p.mainText.find('span').attr('refNum', '');

    var counter = 0;
    p.reference.find('div.comment').each(function () {
        counter++;
        $(this).attr('refNum', counter);
        p.mainText.find('span[ref="' + $(this).attr('anchorref') + '"]').attr('refNum', counter);
    });
}

function addWarning(warning, n) {
    n = n || pageCounter;
    $('.page[page="' + n + '"] .warning ul').append('<li>' + warning + '</li>');
    console.warn(warning + ' On page ' + n + '.');
}

function itsTooEmpty(n) {
    var p = page(n);
    if (p.body.length === 0) return false;

    var used = p.body.outerHeight(true) + p.reference.outerHeight(true);
    return used < (pageHeight - 2 * pageVerticalPadding) * 0.9;
}

function emptyPage(n) {
    return page(n).mainText.text() === '';
}
