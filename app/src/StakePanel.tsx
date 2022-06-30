import React, { useState, useRef, useEffect, useCallback } from 'react'

class StakePanel extends React.Component {
    props: any;
    constructor(props: any) {
        super(props);

        this.props = props;
//        this.visible = true;
    }

    render() {
        const props = this.props;

//        console.log("Panel render, visible: ", props.visible);
//        const background = props.visible ? 'rgba(20, 19, 19, 0.396)' : 'rgba(20, 19, 19, 0.0)'
        const style = {background: 'rgba(20, 19, 19, 0.5)'} 
         
        return props.visible ?
            (
                <div className='stake-panel' style={style}>
                    <div className='header'></div>
                    <div>
                        <input type='button' 
                            value={this.props.startButtonLabel} 
                            disabled={this.props.startButtonDisabled}
                            onClick={this.props.onStartSessionClick}>
                        </input>
                    </div>
                    <div>
                        <input type='button' value='Stop' onClick={this.props.sendStopSessionClick}></input>
                    </div>
                    <div>
                        <input type='button' value='Delete User' disabled={true} onClick={this.props.onDeleteUserClick}></input>

                    </div>
                </div>
            )
            :
            null
    }
}

export default StakePanel;