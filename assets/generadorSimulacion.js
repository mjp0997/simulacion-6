var viaAuxiliar = 0;
var registro_viaAuxiliar = Array();
var registro_embotellamientos = Array();

const form = document.querySelector('#form');

async function generarSimulacion (momentoSimulacion, fechaConclusion, intervaloEvaluacion = 30) {

    viaAuxiliar = 0;
    registro_viaAuxiliar = Array();
    registro_embotellamientos = Array();

    document.getElementById("reporteEmbotellamiento").innerHTML = "";
    document.getElementById("reporteAuxiliar").innerHTML = "";
    document.querySelector('#container-vias').innerHTML = '';

    if (fechaConclusion.getTime() < momentoSimulacion.getTime()) {
        alert('Fecha de Inicio posterior a Fecha de Conclusion, no es posible realizar la simulacion.');
        return;
    }

    while (fechaConclusion.getTime() >= momentoSimulacion.getTime()) {

        var datosEvaluacion_NorSur = evaluacionVia(momentoSimulacion, 1);
        var datosEvaluacion_SurNor = evaluacionVia(momentoSimulacion, 2);

        var traficoAuxiliar = 0;

        if (datosEvaluacion_NorSur.densidadMomento == 0 && datosEvaluacion_SurNor.densidadMomento == 0 && viaAuxiliar !== 0) {
            viaAuxiliar = 0;
            traficoAuxiliar = 0;
            var eventoVia = {
                tipoEvento : 'Cerrado',
                momentoSimulacion: momentoSimulacion,
                sentidoEvento: viaAuxiliar,
            }
            registro_viaAuxiliar.push(eventoVia);
        }
        
        var densidadMaxima = 126;

        datosEvaluacion_NorSur.arrayKilometros = generarAleatorio(densidadMaxima, datosEvaluacion_NorSur.densidadMomento - 1);

        if (viaAuxiliar == 1) {
            datosEvaluacion_NorSur.arrayKilometros = repartirDensidad(datosEvaluacion_NorSur.arrayKilometros);
        }

        datosEvaluacion_SurNor.arrayKilometros = generarAleatorio(densidadMaxima, datosEvaluacion_SurNor.densidadMomento);

        if (viaAuxiliar == 2) {
            datosEvaluacion_SurNor.arrayKilometros = repartirDensidad(datosEvaluacion_SurNor.arrayKilometros);
        }

        decidirTransito(datosEvaluacion_NorSur, datosEvaluacion_SurNor, momentoSimulacion);

        generarFront(momentoSimulacion, datosEvaluacion_NorSur, datosEvaluacion_SurNor, viaAuxiliar, traficoAuxiliar);

        momentoSimulacion = new Date((momentoSimulacion.getTime() + (intervaloEvaluacion*60*1000)));
    }

    reporteAuxiliar(registro_viaAuxiliar);

    reporteEmbotellamientos(registro_embotellamientos);

}

function evaluacionVia (momentoSimulacion, sentidoVia) {

    var diaSimulacion = momentoSimulacion.getDay();
    var horasPico;

    if (diaSimulacion > 0 && diaSimulacion < 6) {
        if (sentidoVia == 1) {
            horasPico = [[[6,0],[9,0],119], [[11,30],[13,0],105], [[17,0],[19,30],120]];
        } else {
            horasPico = [[[6,0],[9,0],117], [[11,30],[13,0],98], [[17,0],[21,15], 76]];
        }
    } else {
        if (sentidoVia == 1) {
            horasPico = [[[13,0],[15,0],107], [[18,0],[20,0],80]];
        } else {
            horasPico = [[[7,0],[9,30],105], [[16,30],[22,0],54]];
        }
    }

    var densidadRetorno = 0;
    var horasPicoRetorno = Array();

    horasPico.forEach(horaPico => {
        var horaInicio = new Date(momentoSimulacion.getFullYear(), momentoSimulacion.getMonth(), momentoSimulacion.getDate());
        
        horaInicio.setHours(horaPico[0][0]);
        horaInicio.setMinutes(horaPico[0][1]);
        horaInicio.setSeconds(0);

        var horaFin = new Date(momentoSimulacion.getFullYear(), momentoSimulacion.getMonth(), momentoSimulacion.getDate());
        horaFin.setHours(horaPico[1][0]);
        horaFin.setMinutes(horaPico[1][1]);
        horaFin.setSeconds(0);
        
        horasPicoRetorno.push([horaInicio, horaFin]);

        if (momentoSimulacion.getTime() >= horaInicio.getTime() && momentoSimulacion.getTime() < horaFin.getTime()) {
            densidadRetorno = horaPico[2];
        }
    });

    var datosRetorno = {
        horasPico: horasPicoRetorno,
        densidadMomento: densidadRetorno,
        via: sentidoVia,
    }

    return datosRetorno;
}

function decidirTransito (viaEvaluar1, viaEvaluar2, momentoSimulacion) {

   var embotellamientos_via1 = contarEmbotellamientos(viaEvaluar1, momentoSimulacion);
   var embotellamientos_via2 = contarEmbotellamientos(viaEvaluar2, momentoSimulacion);

   var viaEscogida = null;

    if (embotellamientos_via1 == embotellamientos_via2 && embotellamientos_via1 !== 0) {
        viaEscogida = viaEvaluar1;
        viaEscogida.embotellamientos = embotellamientos_via1;

    }

   if (embotellamientos_via1 > embotellamientos_via2) {
        viaEscogida = viaEvaluar1;
        viaEscogida.embotellamientos = embotellamientos_via1;
        
   } else if (embotellamientos_via1 < embotellamientos_via2) {
        viaEscogida = viaEvaluar2;
        viaEscogida.embotellamientos = embotellamientos_via2;
   }

   if (viaEscogida !== null) {
        if (viaAuxiliar == 0) {
            if (viaEscogida.densidadMomento !== 0) {
                viaAuxiliar = viaEscogida.via;
                evento_viaAuxiliar = {
                    tipoEvento: 'Apertura',
                    momentoSimulacion: momentoSimulacion,
                    detallesEvento: viaEscogida,
                }
                registro_viaAuxiliar.push(evento_viaAuxiliar);
            }
        }
   }

}

function contarEmbotellamientos (viaEvaluar, momentoSimulacion) {

    var vigilanteKilometro = 0;
    var contadorEmbotellamientos = 0;
    viaEvaluar.arrayKilometros.forEach(kilometroDensidad => {
        
        if (kilometroDensidad >= 125) {
            var embotellamiento = {
                momentoSimulacion: momentoSimulacion,
                viaCuestion: viaEvaluar.via,
                numeroVehiculos: kilometroDensidad,
                kilometroResponsable: vigilanteKilometro,
            }

           registro_embotellamientos.push(embotellamiento);
           contadorEmbotellamientos++;
        }
        vigilanteKilometro++;
    });

    return contadorEmbotellamientos;
}

function repartirDensidad (viaRepatir) {
    for (let index = 0; index < viaRepatir.length; index++) {
        viaRepatir[index] = Math.trunc(viaRepatir[index] * 3 / 5);
    }

    return viaRepatir;
}

function generarViaAuxiliar(datosEvaluacion) {
    for (let index = 0; index < (datosEvaluacion.length - 1); index++) {
        datosEvaluacion[index] = Math.trunc(datosEvaluacion[index] * 2 / 5);
    }

    return datosEvaluacion;
}

function generarAleatorio (max, min) {

    let arrayAleatorios = Array(12);

    for (let index = 0; index <= (arrayAleatorios.length - 1); index++) {
        arrayAleatorios[index] = Math.trunc(Math.random()*(max - min) + min);
    }

    return arrayAleatorios;
}

function generarVia (datosEvaluacion) {
    let list = [];
    
    datosEvaluacion.arrayKilometros.forEach(kilometroDensidad => {
        const li = document.createElement('li');
        li.innerText = kilometroDensidad;
        
        if (kilometroDensidad >= 125) {
            li.style.color = "red";
            li.style.fontWeight = "bold";
        }

        list.push(li);
    });

    return list;
}

function generarFront (momentoSimulacion, via1, via2, viaAuxiliar,  traficoAuxiliar) {

    const container = document.querySelector('#container-vias');

    const element = document.createElement('div');
    element.classList.add('vias');

    const momento = document.createElement('p');
    momento.innerText = moment(momentoSimulacion).format('DD/MM/YYYY HH:mm');
    momento.addEventListener('click', function() {
        this.parentElement.classList.toggle('show');
    });
    element.appendChild(momento);

    const separador = document.createElement('div');
    separador.classList.add('separator');

    // Eje y

    const yAxis = document.createElement('div');
    yAxis.classList.add('rvias');
    yAxis.innerHTML = `
        <h3>Km</h3>
        <h4>-</h4>
        <ul>
            <li>1</li>
            <li>2</li>
            <li>3</li>
            <li>4</li>
            <li>5</li>
            <li>6</li>
            <li>7</li>
            <li>8</li>
            <li>9</li>
            <li>10</li>
            <li>11</li>
            <li>12</li>
        </ul>
    `;
    separador.appendChild(yAxis);

    // Sentido norte sur

    const norteSur = document.createElement('div');
    norteSur.classList.add('rvias');

    const tituloNs = document.createElement('h3');
    tituloNs.innerText = 'norte-sur';
    norteSur.appendChild(tituloNs);

    const picoNs = document.createElement('h4');
    picoNs.textContent = '-';
    if (via1.densidadMomento > 0) {
        picoNs.style.color = "red";
        picoNs.textContent = 'Hora pico';
    }
    norteSur.appendChild(picoNs);

    const ulNs = document.createElement('ul');
    const listaNs = generarVia(via1);
    listaNs.forEach(li => {
        ulNs.appendChild(li);
    });
    norteSur.appendChild(ulNs);
    
    separador.appendChild(norteSur);

    // Sentido sur norte

    const surNorte = document.createElement('div');
    surNorte.classList.add('rvias');

    const tituloSn = document.createElement('h3');
    tituloSn.innerText = 'norte-sur';
    surNorte.appendChild(tituloSn);

    const picoSn = document.createElement('h4');
    picoSn.textContent = '-';
    if (via1.densidadMomento > 0) {
        picoSn.style.color = "red";
        picoSn.textContent = 'Hora pico';
    }
    surNorte.appendChild(picoSn);

    const ulSn = document.createElement('ul');
    const listaSn = generarVia(via2);
    listaSn.forEach(li => {
        ulSn.appendChild(li);
    });
    surNorte.appendChild(ulSn);
    
    separador.appendChild(surNorte);

    // Via auxiliar

    const aux = document.createElement('div');

    const auxTitle = document.createElement('h3');
    auxTitle.innerText = 'Vía auxiliar';
    aux.appendChild(auxTitle);

    const auxState = document.createElement('h4');
    if (viaAuxiliar == 0) {
        auxState.innerText = 'Cerrada';
    }
    if (viaAuxiliar == 1) {
        auxState.innerText = 'Norte-Sur';
    }
    if (viaAuxiliar == 2) {
        auxState.innerText = 'Sur-Norte';
    }
    aux.appendChild(auxState);
    
    separador.appendChild(aux);

    // Montaje

    element.appendChild(separador);

    container.appendChild(element);
}


function iniciarSimulacion (e) {
    e.preventDefault();
    
    var momentoInicio = {
        fechaInicio: document.getElementById('fechaInicio').value,
        inicioHora: parseInt(document.getElementById('inicioHora').value),
        inicioMins: parseInt(document.getElementById('inicioMins').value),
    }

    var momentoFin = {
        fechaFin: document.getElementById('fechaFin').value,
        finHora: parseInt(document.getElementById('finHora').value),
        finMins: parseInt(document.getElementById('finMins').value),
    }

    if (momentoInicio.fechaInicio == "" || isNaN(momentoInicio.inicioHora) == true) {
        alert("Datos de inicio de Simulacion Incompletos o incorrectos");
        return;
    }

    if (momentoFin.fechaFin == "" || isNaN(momentoFin.finHora) == true) {
        alert("Datos de Fin de Simulacion incompletos o incorrectos");
        return;
    }


    if (momentoInicio.inicioHora > 23 || momentoInicio.inicioMins > 59) {
        alert('La hora de inicio no es valida');
        return;
    }

        var inicioSimulacion = new Date(momentoInicio.fechaInicio);
        inicioSimulacion.setHours(momentoInicio.inicioHora);
        if (isNaN(momentoInicio.inicioMins) == true) {
            momentoInicio.inicioMins = 0;
        }
        inicioSimulacion.setMinutes(momentoInicio.inicioMins);
    

    if (momentoFin.finHora > 23 || momentoFin.finMins > 59) {
        alert('La hora de fin no es valida');
        return;
    } 

        var finSimulacion = new Date(momentoFin.fechaFin);
        finSimulacion.setHours(momentoFin.finHora);
        if (isNaN(momentoFin.finMins) == true) {
            momentoFin.finMins = 0;
        }
        finSimulacion.setMinutes(momentoFin.finMins);
    

    generarSimulacion(inicioSimulacion, finSimulacion);

}

function reporteEmbotellamientos(registro_embotellamientos) {

    var reportesDIV = document.getElementById("reporteEmbotellamiento");

    const table = [{
        via: 'Vía',
        quantity: '# de vehículos',
        km: 'Km',
        date: 'Fecha',
        time: 'Hora'
    }, ...registro_embotellamientos.map(el => ({
        via: el.viaCuestion,
        quantity: el.numeroVehiculos,
        km: el.kilometroResponsable,
        date: moment(el.momentoSimulacion).format('DD/MM/YYYY'),
        time: moment(el.momentoSimulacion).format('HH:mm')
    }))];

    const div1 = document.createElement('div');
    const div2 = document.createElement('div');
    const div3 = document.createElement('div');
    const div4 = document.createElement('div');
    const div5 = document.createElement('div');

    table.forEach(el => {
        div1.appendChild(reportP(el.via));
        div2.appendChild(reportP(el.quantity));
        div3.appendChild(reportP(el.km));
        div4.appendChild(reportP(el.date));
        div5.appendChild(reportP(el.time));
    });

    reportesDIV.appendChild(div1);
    reportesDIV.appendChild(div2);
    reportesDIV.appendChild(div3);
    reportesDIV.appendChild(div4);
    reportesDIV.appendChild(div5);
}

function reporteAuxiliar(registro_viaAuxiliar) {

    var reportesDIV = document.getElementById("reporteAuxiliar");

    const ini = registro_viaAuxiliar.filter(el => el.detallesEvento);

    const fin = registro_viaAuxiliar.filter(el => !el.detallesEvento);

    const mapped = ini.map((el, i) => ({
        ...el,
        finSimulacion: fin[i] ? fin[i].momentoSimulacion : null
    }));

    const table = [{
        via: 'Vía',
        inicio: 'Inicio',
        fin: 'Fin'
    }, ...mapped.map(el => ({
        via: el.detallesEvento.via,
        inicio: moment(el.momentoSimulacion).format('DD/MM/YYYY HH:mm'),
        fin: el.finSimulacion ? moment(el.finSimulacion).format('DD/MM/YYYY HH:mm') : '-',
    }))];

    const div1 = document.createElement('div');
    const div2 = document.createElement('div');
    const div3 = document.createElement('div');

    table.forEach(el => {
        div1.appendChild(reportP(el.via));
        div2.appendChild(reportP(el.inicio));
        div3.appendChild(reportP(el.fin));
    });

    reportesDIV.appendChild(div1);
    reportesDIV.appendChild(div2);
    reportesDIV.appendChild(div3);

    // registro_viaAuxiliar.forEach(evento => {
    //     var reporte = document.createElement('h4');
    //     if (evento.detallesEvento) {
    //         var reporteTexto = evento.tipoEvento + ", Sentido: " + evento.detallesEvento.via + ", Fecha: "  + evento.momentoSimulacion.getDate() + "/" + evento.momentoSimulacion.getMonth() + "/" + evento.momentoSimulacion.getFullYear() + ", Hora: " + evento.momentoSimulacion.getHours() + ":" + evento.momentoSimulacion.getMinutes();
    //     } else {
    //         var reporteTexto = evento.tipoEvento + ", Fecha: "  + evento.momentoSimulacion.getDate() + "/" + evento.momentoSimulacion.getMonth() + "/" + evento.momentoSimulacion.getFullYear() + ", Hora: " + evento.momentoSimulacion.getHours() + ":" + evento.momentoSimulacion.getMinutes();
    //     }
    //     reporteTexto = document.createTextNode(reporteTexto);
    //     reporte.appendChild(reporteTexto);
    //     reportesDIV.appendChild(reporte);
    // });
}

const reportP = (text) => {
    const p = document.createElement('p');
    p.innerText = text;

    return p;
}

document.addEventListener('DOMContentLoaded', () => {
    form.addEventListener('submit', iniciarSimulacion);
})