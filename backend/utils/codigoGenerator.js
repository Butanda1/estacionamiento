// Generar todas las combinaciones posibles (sin repetición de dígitos)
function generarTodosLosCodigos() {
  const codigos = [];
  
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      if (b === a) continue;
      for (let c = 0; c <= 9; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d <= 9; d++) {
          if (d === a || d === b || d === c) continue;
          codigos.push(`${a}${b}${c}${d}`);
        }
      }
    }
  }
  
  return codigos; // 5040 elementos
}

// Mezclar aleatoriamente
function mezclarArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generador secuencial de códigos únicos
function crearGeneradorUnico() {
  const todos = mezclarArray(generarTodosLosCodigos());
  let indice = 0;
  
  return function generarCodigoUnico() {
    if (indice >= todos.length) {
      // Si se agotan los códigos, reiniciamos el mezclado para no romper la ejecución,
      // aunque en teoría no debería haber más de 5040 tickets activos simultáneamente.
      indice = 0;
      mezclarArray(todos);
    }
    return todos[indice++];
  };
}

const generarCodigo = crearGeneradorUnico();

module.exports = {
  generarCodigo,
  crearGeneradorUnico
};
