import React, { useRef, useEffect, useState, useReducer } from 'react'
import { createTetrimino, createTetriminoByValue } from './tetrimino'
import { setupStakan, stamp, clearRows, isFull, canMove, STAKAN_BORDER_VALUE } from './stakanLogic'
import CanvasButton from './CanvasButton'

const drawScore = (ctx, x, y, width, score) => {
  ctx.font = 'IBM Plex Mono';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
//  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  const text = 'score ' + score.toString();
  ctx.fillText(text, x, y);
}

const drawTiles = (ctx, tiles, tileSize) => {
  const rowsWithBorder = tiles.rowsWithBorder;
  const colsWithBorder = tiles.colsWithBorder;

//    console.log("rows:", rowsWithBorder, "cols: ", colsWithBorder)
//    console.log("ctx.canvas.width:", ctx.canvas.width, "ctx.canvas.height: ", ctx.canvas.height)
//    console.log("cols_width: ", cols_width, "row_heigth:", row_heigth, "tileSize: ", tileSize)

  for ( let i = 0; i < colsWithBorder; i++ ) {
    for ( let j = 0; j < rowsWithBorder; j++ ) {
      const { x, y } = tiles.tileToViewPos(i, j);
      ctx.save();
  
      if (tiles.tiles[i][j] === STAKAN_BORDER_VALUE) {
        ctx.fillStyle = 'rgb(0,0,0)';
      }
      else
      if (tiles.tiles[i][j] !== 0) { // a piece is here
        ctx.fillStyle = createTetriminoByValue(tiles.tiles[i][j]).color;
      }
      else if (i % 2 === 0) {
//        ctx.fillStyle = 'rgba(10,10,10, 0.3)';
        ctx.fillStyle = 'rgb(10,10,10)';
      } 
      else ctx.fillStyle = 'rgb(0,0,0)';

      ctx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize);
      ctx.restore();
    }
  }

  ctx.strokeStyle = 'grey';
  ctx.lineWidth = 0.3;
  ctx.beginPath();       
  ctx.moveTo(tiles.sideThickness*tileSize, 0);    
  ctx.lineTo(tiles.sideThickness*tileSize, ctx.canvas.height - 1*tileSize);  
  ctx.lineTo((tiles.sideThickness + tiles.cols)*tileSize, ctx.canvas.height - 1*tileSize);  
  ctx.lineTo((tiles.sideThickness + tiles.cols)*tileSize, 0);    
  ctx.stroke();
} 

const drawPiece = (ctx, tiles, tileSize, piece, pieceXOffset, pieceYOffset, color) => {
  for ( let i = 0; i < 4; i++ ) {
    for ( let j = 0; j < 4; j++ ) {
      if (piece[4-1-j][i] !== 0) {
        const { x, y } = tiles.tileToViewPos(i+pieceXOffset, j+pieceYOffset);
          ctx.save();
          ctx.fillStyle = color;
          ctx.fillRect(x*tileSize, y*tileSize, tileSize, tileSize);
          ctx.restore();
      }
    }
  }
}

class StakanView extends React.Component {

  constructor(props) {
      super(props);

      this.props = props;

      this.session = null;
      this.currentPiece = null; 
      this.canvasRef = React.createRef();
      this.tiles = setupStakan(props.rows, props.cols);
      this.tileSize = 10;
      this.rotationPosition = 0;
    
      this.setSession = this.setSession.bind(this);
      this.fitToParent = this.fitToParent.bind(this);
      this.pieceEntryCommand = this.pieceEntryCommand.bind(this);
      this.tryNextRound = this.tryNextRound.bind(this);
      this.moveDown = this.moveDown.bind(this);
      this.rotateCounterClockwise = this.rotateCounterClockwise.bind(this);
      this.rotateClockwise = this.rotateClockwise.bind(this);
      this.moveRight = this.moveRight.bind(this);
      this.moveLeft = this.moveLeft.bind(this);
      this.softDrop = this.softDrop.bind(this);
      this.hardDrop = this.hardDrop.bind(this);
      this.startPieceXOffset = this.startPieceXOffset.bind(this);
      this.startPieceYOffset = this.startPieceYOffset.bind(this);
      this.focus = this.focus.bind(this);
  }

  setSession(session) {
    this.session = session;

    this.pieceXOffset = this.startPieceXOffset();
    this.pieceYOffset = this.startPieceYOffset();
    this.rotationPosition = 0;
    this.tiles = setupStakan(this.props.rows, this.props.cols);
  }
  
  fitToParent() {
//    console.log("fitToParent: ", this.canvasRef.current);

    this.tileSize = ( 0.8 * window.innerHeight / this.tiles.rowsWithBorder );

    if (this.canvasRef.current === null ) return;

    this.canvasRef.current.width = this.tiles.colsWithBorder * this.tileSize;
    this.canvasRef.current.height = this.tiles.rowsWithBorder * this.tileSize;

    this.props.willRender();
  }
  
  startPieceXOffset() { return Math.floor(this.tiles.colsWithBorder/2 - 1) }
  startPieceYOffset() { return this.tiles.rowsWithBorder - 4; }

  pieceEntryCommand() {
//    console.log("StakanView->pieceEntryCommand(), tiles: ", this.tiles, this.currentPiece);
//    this.session = session;
  
    this.pieceXOffset = this.startPieceXOffset();
    this.pieceYOffset = this.startPieceYOffset();
    this.rotationPosition = 0;

    this.currentPiece = createTetriminoByValue(1 + Math.floor(Math.random() * 7));

    this.props.willRender();
  }
  
  tryNextRound() {
      stamp(this.currentPiece.piece[this.rotationPosition], 
              this.tiles, 
              this.pieceXOffset, 
              this.pieceYOffset, 
              this.currentPiece.color
    );

    if (!isFull(this.tiles)) {
    
      const linesCleared = clearRows(this.tiles, this.pieceYOffset);

      this.currentPiece = null;
      
      this.props.evEntryNewPiece();
    } else {
      this.props.onGameOver()
    }
  }

  moveDown() {
    if (canMove(this.currentPiece.piece[this.rotationPosition], this.tiles, this.pieceXOffset, this.pieceYOffset - 1))
      this.pieceYOffset -= 1;
    else {
      this.tryNextRound()
    }
    this.props.willRender();
  }

  rotateCounterClockwise() {
    const nextRotationPosition = (this.rotationPosition + 1) % 4
    if (canMove(this.currentPiece.piece[nextRotationPosition], this.tiles, this.pieceXOffset, this.pieceYOffset)) {
      this.rotationPosition = nextRotationPosition;
      this.props.willRender();
    } 
  }

  rotateClockwise() {
    const nextRotationPosition = (this.rotationPosition + 3) % 4
    if (canMove(this.currentPiece.piece[nextRotationPosition], this.tiles, this.pieceXOffset, this.pieceYOffset)) {
      this.rotationPosition = nextRotationPosition;
      this.props.willRender();
    } 
  }

  moveRight() {
    if (canMove(this.currentPiece.piece[this.rotationPosition], this.tiles, this.pieceXOffset + 1, this.pieceYOffset)) {
      this.pieceXOffset += 1;
      this.props.willRender();
    }
  }

  moveLeft() {
    if (canMove(this.currentPiece.piece[this.rotationPosition], this.tiles, this.pieceXOffset - 1, this.pieceYOffset)) {
      this.pieceXOffset -= 1;
      this.props.willRender();
    }
  }

  softDrop() {
    if (canMove(this.currentPiece.piece[this.rotationPosition], this.tiles, this.pieceXOffset, this.pieceYOffset - 1)) {
      this.pieceYOffset -= 1;
      this.props.willRender();
    }
  }

  hardDrop() {
    let nextYOffset = this.pieceYOffset;
    while (canMove(this.currentPiece.piece[this.rotationPosition], this.tiles, this.pieceXOffset, nextYOffset - 1)) {
      nextYOffset--
    }
    this.pieceYOffset = nextYOffset; 

    this.tryNextRound()
    this.props.willRender();
  }

  focus() {
    this.canvasRef.current.focus();
  } 

  render() {
    if ( this.canvasRef.current !== null ) {
      const context = this.canvasRef.current.getContext('2d')
      
      drawTiles(context, this.tiles, this.tileSize)
    
      if (this.session !== null && this.currentPiece !== null) {
        
        drawPiece(context, this.tiles, this.tileSize, this.currentPiece.piece[this.rotationPosition], 
          this.pieceXOffset, this.pieceYOffset, this.currentPiece.color
          )
      }
    }

    return (
      <canvas className="stakan-canvas" tabIndex={0} ref={this.canvasRef}> </canvas>
    )           
  }

}
export default StakanView
