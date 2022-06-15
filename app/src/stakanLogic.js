export const STAKAN_BORDER_VALUE = 8;
const BOTTOM_THICKNESS = 1;
const SIDE_THICKNESS = 3;
const TOP_OFFSET = 4;

export function setupStakan(rows, cols) {
    const stakanMatrix 
      = Array.from(
        { length: cols + 2*SIDE_THICKNESS }, 
        (_, column) => {   
          return Array.from(
              { length: rows + TOP_OFFSET + 1 }, 
              (_, row) => {
                if (column < SIDE_THICKNESS || column > (cols + 2*SIDE_THICKNESS - SIDE_THICKNESS - 1) ) return STAKAN_BORDER_VALUE 
                else return (0 === row) ? STAKAN_BORDER_VALUE : 0 
          })
      }) 
  
    return { 
      tiles: stakanMatrix,
      rows,
      cols,
      topOffset: TOP_OFFSET,
      bottomThickness: BOTTOM_THICKNESS,
      sideThickness: SIDE_THICKNESS,
      rowsWithBorder: rows + TOP_OFFSET + BOTTOM_THICKNESS,
      colsWithBorder: cols + 2*SIDE_THICKNESS,
  
      tileToViewPos: (i, j) => {
        return { x: i, y: rows - j + TOP_OFFSET }
      },  
  
    };
  }


  export function canMove(piece, stakan, xOffset, yOffset) {
    for ( let i = 0; i < 4; i++ ) {
        for ( let j = 0; j < 4; j++ ) {
  //          console.log("i=", i, "J=", j, "xOffset=", xOffset, "yOffset=", yOffset);
            if (
  //            (stakan.tiles[i + xOffset][j + yOffset] & piece[4-1-j][i]) !== 0
              (stakan.tiles[i + xOffset][j + yOffset] !== 0 && piece[4-1-j][i] !== 0)
            ) {
              return false;
            }
        }
    }
    return true;
  }
  
  export function stamp(piece, stakan, xOffset, yOffset) {
    let nextStakan = { ...stakan };
    for ( let i = 0; i < 4; i++ ) {
  //    console.log(piece[i]);
      for ( let j = 0; j < 4; j++ ) {
        nextStakan.tiles[i + xOffset][j + yOffset] |= piece[4-1-j][i];
      }
    }
    return nextStakan;
  }
  
  export function isFull(stakan) {
    //  for( let i = 1; i < tiles.cols - 1; i++ ) 
    for( let i = 0; i < stakan.cols; i++ ) 
      if (stakan.tiles[i + SIDE_THICKNESS][stakan.rows + 1] !== 0) return true
    return false
  }
    
  export function clearRows(stakan, yOffset) {
    let y = Math.max(yOffset, 1);
    let rowsToClear = [];
  
    for( let j = y; j < y + 4; j++) { // iterate on 4 rows starting from row[y]
      let probe = 1;
      for( let i = 0; i < stakan.cols; i++ ) 
        probe &= stakan.tiles[i + SIDE_THICKNESS][j] !== 0;
      if (1 === probe) {
        rowsToClear = [...rowsToClear, j];
      }
    }

    for (let r of rowsToClear.slice().reverse()) {
      for( let i = 0; i < stakan.cols; i++ ) {
        for (let j = r; j < stakan.rows; j++) {
          stakan.tiles[i + SIDE_THICKNESS][j] = stakan.tiles[i + SIDE_THICKNESS][j+1];
        }
      }
    }
    return rowsToClear;
  }
    