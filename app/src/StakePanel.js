import React, { useState, useRef, useEffect, useCallback } from 'react'

class StakePanel extends React.Component {
    
    constructor(props) {
        super(props);
        this.visible = true;
    }

    render() {
        const props = this.props;
        return this.visible ? (
            <div className='stake-panel'>
            <div className='header'></div>
            <div>
                <input type='button' value='Start' onClick={props.onStartSessionClick}></input>
            </div>
            <div>
                <input type='button' value='Stop' onClick={props.sendStopSessionClick}></input>
            </div>
            </div>
        )
        : null
    }
}

export default StakePanel;